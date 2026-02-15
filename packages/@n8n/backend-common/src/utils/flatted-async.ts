/**
 * Async flatted JSON parsing using stream-json.
 *
 * For large execution data, synchronous flatted.parse() blocks the event loop
 * (e.g. 600ms for 18MB, 2.8s for 75MB). This module provides an async
 * alternative that streams the JSON in 64KB chunks, yielding to the event loop
 * between chunks via setImmediate.
 *
 * ## Benchmark results (real n8n execution data, Apple M3 Pro)
 *
 * **Slowdown:** 1.3–1.5x slower than sync flatted.parse().
 *   - 18 MB execution: ~880ms vs ~585ms sync
 *   - 75 MB execution: ~3.7s vs ~2.8s sync
 *
 * **Event loop lag:** p95 stays at ~3ms even on 75MB payloads.
 *   - Sync flatted blocks the loop for the entire parse (p95 = 2.8s at 75MB).
 *   - Loop max of ~500ms at 75MB comes from the sync revive() step (flatted
 *     reference resolution), which is the next bottleneck to address.
 *
 * **Heap:** 29–36% less peak heap usage than sync flatted.
 *   - 18 MB execution: 95 MB vs 148 MB (36% less)
 *   - 75 MB execution: 422 MB vs 596 MB (29% less)
 *   - Incremental parsing avoids holding the raw JSON string and the full
 *     parsed intermediate array simultaneously.
 *
 * **GC:** More frequent but cheaper collections.
 *   - 75 MB execution: 370ms total GC vs 520ms sync (29% less), despite
 *     440 vs 98 GC events — smaller working set means cheaper collections.
 */
import { Readable } from 'stream';
import { parser } from 'stream-json';
import Asm from 'stream-json/Assembler';

// 64 KB chunks — selected via benchmarks as the sweet spot for event-loop
// responsiveness vs scheduling overhead (p95 lag ~4 ms at 50 MB payload).
const CHUNK_SIZE = 64 * 1024;

// --- Flatted reference resolution (extracted from flatted@3.2.7) ---

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
export async function parseFlatteAsync(flattedString: string): Promise<unknown> {
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
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		});

		jsonParser.on('error', reject);
		readable.on('error', reject);

		readable.pipe(jsonParser);
	});
}
