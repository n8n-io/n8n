/**
 * Async flatted JSON parsing using stream-json.
 *
 * For large execution data, synchronous flatted.parse() blocks the event loop.
 * This module provides an async alternative that streams the JSON in 64KB
 * chunks, yielding to the event loop between chunks via setImmediate.
 */
import { ensureError } from 'n8n-workflow';
import { Readable } from 'stream';
import { parser } from 'stream-json';
import Asm from 'stream-json/Assembler';

// 64 KB chunks — selected via benchmarks as the sweet spot for event-loop
// responsiveness vs scheduling overhead (p95 lag ~4 ms at 50 MB payload).
const CHUNK_SIZE = 64 * 1024;

//#region Flatted reference resolution (extracted from flatted@3.2.7)

const Primitive = String;
const primitive = 'string';
const object = 'object';
const ignore = {};
const noop = (_: string, value: unknown) => value;

const primitives = (value: unknown) =>
	value instanceof Primitive ? Primitive(value as string) : value;

const revive = (
	input: unknown[],
	parsed: Set<unknown>,
	output: Record<string, unknown>,
	$: (key: string, value: unknown) => unknown,
): Record<string, unknown> => {
	const lazy: Array<{
		k: string;
		a: [unknown[], Set<unknown>, Record<string, unknown>, typeof $];
	}> = [];
	const ke = Object.keys(output);
	for (let y = 0; y < ke.length; y++) {
		const k = ke[y];
		const value = output[k];
		if (value instanceof Primitive) {
			const tmp = (input as unknown as Record<string, unknown>)[value as unknown as string];
			if (typeof tmp === object && !parsed.has(tmp)) {
				parsed.add(tmp);
				output[k] = ignore;
				lazy.push({ k, a: [input, parsed, tmp as Record<string, unknown>, $] });
			} else {
				output[k] = $.call(output, k, tmp);
			}
		} else if (output[k] !== ignore) {
			output[k] = $.call(output, k, value);
		}
	}
	for (let i = 0; i < lazy.length; i++) {
		const { k, a } = lazy[i];
		output[k] = $.call(output, k, revive(...a));
	}
	return output;
};

/**
 * Resolve flatted references on a pre-parsed array.
 * This reconstructs the original object graph including circular references.
 */
function resolveFlatted(rawArray: unknown[]): unknown {
	const input = rawArray;
	const value = input[0];
	const $ = noop;
	const tmp =
		typeof value === object && value
			? revive(input, new Set(), value as Record<string, unknown>, $)
			: value;
	return $.call({ '': tmp }, '', tmp);
}

//#endregion Flatted reference resolution

/**
 * Recursively convert every string value into a String object wrapper.
 * This replicates what JSON.parse(text, Primitives) does so that flatted
 * can distinguish index references from literal string values.
 */
function applyPrimitivesDeep(value: unknown): unknown {
	if (typeof value === primitive) {
		return new Primitive(value);
	}
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			value[i] = applyPrimitivesDeep(value[i]);
		}
		return value;
	}
	if (typeof value === object && value !== null) {
		const ke = Object.keys(value as Record<string, unknown>);
		for (let i = 0; i < ke.length; i++) {
			const k = ke[i];
			(value as Record<string, unknown>)[k] = applyPrimitivesDeep(
				(value as Record<string, unknown>)[k],
			);
		}
		return value;
	}
	return value;
}

/**
 * Prepare raw parsed JSON for flatted reference resolution.
 * Applies the Primitives transformation then unwraps String objects.
 */
function prepareFlatted(rawParsed: unknown[]): unknown[] {
	return (applyPrimitivesDeep(rawParsed) as unknown[]).map(primitives);
}

/**
 * Parse a flatted JSON string asynchronously using stream-json.
 * Streams the string in 64KB chunks, yielding to the event loop between chunks
 * via setImmediate, then resolves flatted references synchronously.
 */
export async function parseFlattedAsync(flattedString: string): Promise<unknown> {
	return await new Promise((resolve, reject) => {
		let offset = 0;
		const readable = new Readable({
			read() {
				if (offset >= flattedString.length) {
					this.push(null);
					return;
				}
				const chunk = flattedString.slice(offset, offset + CHUNK_SIZE);
				offset += CHUNK_SIZE;
				setImmediate(() => {
					this.push(chunk);
				});
			},
		});

		const jsonParser = parser();
		const asm = Asm.connectTo(jsonParser);

		asm.on('done', (asmResult: { current: unknown[] }) => {
			try {
				const prepared = prepareFlatted(asmResult.current);
				resolve(resolveFlatted(prepared));
			} catch (e) {
				reject(ensureError(e));
			}
		});

		jsonParser.on('error', reject);
		readable.on('error', reject);

		readable.pipe(jsonParser);
	});
}
