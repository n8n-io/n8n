/**
 * The library nodes Extract From File and Convert To File against v1. Each case runs the v1
 * workflow in n8n's engine (`runOracle`, the real nodes of n8n-nodes-base) and the converted
 * workflow on the reference runner. The `binaryData` service calls of the converted run get
 * the answer of `runBinaryDataCall` over the real `prepareBinaryData` and `chardet` of
 * n8n-core. The output items with their `$binary` (an empty `binary` object too), and the
 * message and the description of the error, must be the same.
 *
 * A case with `host: true` must hand the node over to the fallback host: there the v1 node
 * runs, so the test checks only that the compiled form gives no result of its own.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';
import { runBinaryDataCall, type BinaryDataBackend } from '../../services/binary-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const hostPackage = join(here, '../../../../workflow-fallback-host/package.json');

interface Core {
	prepareBinaryData(
		bytes: Buffer,
		executionId: string,
		workflowId: string,
		filePath?: string,
		mimeType?: string,
	): Promise<unknown>;
	detectBinaryEncoding(bytes: Buffer): string;
}

interface InputItem {
	json: Record<string, unknown>;
	binary?: Record<string, unknown>;
}

interface Case {
	name: string;
	type: 'extractFromFile' | 'convertToFile';
	version?: number;
	parameters: Record<string, unknown>;
	items: InputItem[];
	onError?: string;
	/** The node must run in the fallback host: at conversion (`static`) or at run time. */
	host?: 'static' | 'run';
}

const bytes = (list: number[]) => Buffer.from(list).toString('base64');
const utf8 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const latin1 = (text: string) => Buffer.from(text, 'latin1').toString('base64');
const file = (data: string, more: Record<string, unknown> = {}) => ({
	data,
	mimeType: 'text/plain',
	...more,
});
const one = (data: string, json: Record<string, unknown> = { a: 1 }): InputItem[] => [
	{ json, binary: { data: file(data) } },
];
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const BOM = bytes([0xef, 0xbb, 0xbf, 0x68, 0xc3, 0xa9]);

const extract = (
	name: string,
	parameters: Record<string, unknown>,
	items: InputItem[],
	more: Partial<Case> = {},
): Case => ({ name: `extract: ${name}`, type: 'extractFromFile', parameters, items, ...more });
const convert = (
	name: string,
	parameters: Record<string, unknown>,
	items: InputItem[],
	more: Partial<Case> = {},
): Case => ({ name: `convert: ${name}`, type: 'convertToFile', parameters, items, ...more });

const CONTINUE = { onError: 'continueRegularOutput' };

const CASES: Case[] = [
	// ---- Extract From File: text ----
	extract('text, defaults', { operation: 'text' }, one(utf8('line 1\nline 2\r\n'))),
	extract('text, version 1', { operation: 'text', options: {} }, one(utf8('x')), { version: 1 }),
	extract('text, version 1.2', { operation: 'text', options: {} }, one(utf8('x')), {
		version: 1.2,
	}),
	extract('text, an empty file', { operation: 'text' }, one('')),
	extract('text, control characters', { operation: 'text' }, one(utf8('a\tb\u0001c\u007f'))),
	extract('text, the JSON is kept', { operation: 'text', options: { keepSource: 'json' } }, one(utf8('x'))),
	extract(
		'text, the binary data is kept',
		{ operation: 'text', options: { keepSource: 'binary' } },
		one(utf8('x')),
	),
	extract('text, both are kept', { operation: 'text', options: { keepSource: 'both' } }, one(utf8('x'))),
	extract(
		'text, the destination key is a key of the kept JSON',
		{ operation: 'text', destinationKey: 'a', options: { keepSource: 'json' } },
		one(utf8('x')),
	),
	extract(
		'text, another field and another key, the other file stays',
		{ operation: 'text', binaryPropertyName: 'doc', destinationKey: 'content' },
		[{ json: {}, binary: { doc: file(utf8('d')), data: file(utf8('x'), { fileName: 'a.txt' }) } }],
	),
	extract(
		'text, the field name and the key from the item',
		{
			operation: 'text',
			binaryPropertyName: '={{ $json.field }}',
			destinationKey: '={{ $json.key }}',
		},
		[
			{ json: { field: 'one', key: 'k1' }, binary: { one: file(utf8('1')) } },
			{ json: { field: 'two', key: 'k2' }, binary: { two: file(utf8('2')) } },
		],
	),
	extract('text, UTF-8 that chardet finds', { operation: 'text' }, one(utf8('héllo wörld, ça va très bien'))),
	extract('text, Latin-1 that chardet finds', { operation: 'text' }, one(latin1('héllo wörld, ça va très bien'))),
	extract('text, UTF-8 by option', { operation: 'text', options: { encoding: 'utf8' } }, one(utf8('é€😀'))),
	extract(
		'text, bytes that are not UTF-8, by option',
		{ operation: 'text', options: { encoding: 'utf8' } },
		one(bytes([0x61, 0xff, 0x62, 0xc3])),
	),
	extract('text, a byte order mark', { operation: 'text', options: { encoding: 'utf8' } }, one(BOM)),
	extract(
		'text, a byte order mark that stays',
		{ operation: 'text', options: { encoding: 'utf8', stripBOM: false } },
		one(BOM),
	),
	extract(
		'text, a byte order mark that goes',
		{ operation: 'text', options: { encoding: 'utf8', stripBOM: true } },
		one(BOM),
	),
	extract('text, a byte order mark and chardet', { operation: 'text' }, one(BOM)),
	extract(
		'text, the option for the mark without an encoding',
		{ operation: 'text', options: { stripBOM: false } },
		one(BOM),
	),
	extract(
		'text, the option for the mark with Latin-1',
		{ operation: 'text', options: { stripBOM: false, encoding: 'latin1' } },
		one(BOM),
	),
	extract(
		'text, ASCII with an option for another encoding',
		{ operation: 'text', options: { encoding: 'windows-1252' } },
		one(utf8('plain')),
	),
	extract(
		'text, Windows-1252 bytes by option',
		{ operation: 'text', options: { encoding: 'windows-1252' } },
		one(bytes([0x80, 0x41])),
		{ host: 'run' },
	),
	extract(
		'text, UTF-16 by option',
		{ operation: 'text', options: { encoding: 'utf16le' } },
		one(bytes([0x61, 0x00])),
		{ host: 'run' },
	),
	extract('text, a key that is a path', { operation: 'text', destinationKey: 'a.b' }, one(utf8('x')), {
		host: 'run',
	}),
	// ---- Extract From File: errors of the binary field ----
	extract('no binary data', { operation: 'text' }, [{ json: { a: 1 } }]),
	extract('no binary data, continue', { operation: 'text' }, [{ json: { a: 1 } }], CONTINUE),
	extract('another binary field', { operation: 'text', binaryPropertyName: 'doc' }, one(utf8('x'))),
	extract(
		'the second item has no file, continue',
		{ operation: 'fromJson' },
		[...one(utf8('{"n":1}')), { json: { b: 2 } }, ...one(utf8('[1]'))],
		CONTINUE,
	),
	extract('the second item has no file', { operation: 'text' }, [...one(utf8('x')), { json: {} }]),
	// ---- Extract From File: fromJson ----
	extract('fromJson', { operation: 'fromJson' }, one(utf8('{"a":[1,2,{"b":null}],"c":"é"}'))),
	extract('fromJson, a number', { operation: 'fromJson' }, one(utf8(' 12 '))),
	extract('fromJson, an empty file', { operation: 'fromJson' }, one('')),
	extract('fromJson, not JSON', { operation: 'fromJson' }, one(utf8('hello'))),
	extract('fromJson, not JSON, continue', { operation: 'fromJson' }, one(utf8('hello')), CONTINUE),
	extract('fromJson, JSON that ends early', { operation: 'fromJson' }, one(utf8('{"a":'))),
	extract('fromJson, JSON that ends early, continue', { operation: 'fromJson' }, one(utf8('{"a":')), CONTINUE),
	extract('fromJson, text after the JSON', { operation: 'fromJson' }, one(utf8('{"a":1} x'))),
	extract('fromJson, a bad property name', { operation: 'fromJson' }, one(utf8('{a:1}'))),
	extract('fromJson, white space only', { operation: 'fromJson' }, one(utf8('  '))),
	// ---- Extract From File: binaryToPropery and xml ----
	extract('binaryToPropery, text', { operation: 'binaryToPropery' }, one(utf8('abc'))),
	extract('binaryToPropery, bytes', { operation: 'binaryToPropery' }, one(PNG)),
	extract(
		'binaryToPropery, both kept, another key',
		{ operation: 'binaryToPropery', destinationKey: 'b64', options: { keepSource: 'both' } },
		one(PNG),
	),
	extract('xml', { operation: 'xml' }, one(utf8('<?xml version="1.0"?><a b="1"><c>t</c></a>'))),
	extract('xml that is not well-formed', { operation: 'xml' }, one(utf8('<a><b></a>'))),
	// ---- Extract From File: operations in the host ----
	extract('csv is in the host', {}, one(utf8('a,b\n1,2\n')), { host: 'static' }),
	// ---- Convert To File: toText ----
	convert('toText', { operation: 'toText', sourceProperty: 'text' }, [{ json: { text: 'héllo\n' } }]),
	convert('toText, version 1', { operation: 'toText', sourceProperty: 'text' }, [{ json: { text: 'x' } }], {
		version: 1,
	}),
	convert('toText, version 1.2', { operation: 'toText', sourceProperty: 'text' }, [{ json: { text: 'x' } }], {
		version: 1.2,
	}),
	convert(
		'toText, a file name, a byte order mark and a field',
		{
			operation: 'toText',
			sourceProperty: 'text',
			binaryPropertyName: 'doc',
			options: { fileName: 'notes/list.csv', addBOM: true, encoding: 'utf8' },
		},
		[{ json: { text: 'a,b' } }],
	),
	convert('toText, an empty text with a byte order mark', {
		operation: 'toText',
		sourceProperty: 'text',
		options: { addBOM: true },
	}, [{ json: { text: '' } }]),
	convert('toText, an empty text with a byte order mark and an encoding', {
		operation: 'toText',
		sourceProperty: 'text',
		options: { addBOM: true, encoding: 'utf8' },
	}, [{ json: { text: '' } }, { json: { text: 'x' } }]),
	convert('toText, no mark by option', {
		operation: 'toText',
		sourceProperty: 'text',
		options: { addBOM: false, encoding: 'utf8' },
	}, [{ json: { text: 'x' } }]),
	convert('toText, a number, zero, booleans and null', { operation: 'toText', sourceProperty: 'v' }, [
		{ json: { v: 12.5 } },
		{ json: { v: 0 } },
		{ json: { v: true } },
		{ json: { v: false } },
		{ json: { v: null } },
	]),
	convert('toText, an object and an array', { operation: 'toText', sourceProperty: 'v' }, [
		{ json: { v: { a: 1, b: ['x'] } } },
		{ json: { v: [1, 2] } },
	]),
	convert('toText, a value that is not set', { operation: 'toText', sourceProperty: 'missing' }, [
		{ json: { a: 1 } },
	]),
	convert(
		'toText, a value that is not set, continue',
		{ operation: 'toText', sourceProperty: 'missing' },
		[{ json: { a: 1 } }, { json: { missing: 'x' } }],
		CONTINUE,
	),
	convert(
		'toText, Latin-1',
		{ operation: 'toText', sourceProperty: 'text', options: { encoding: 'latin1' } },
		[{ json: { text: 'é' } }],
		{ host: 'run' },
	),
	convert('toText, a source property that is a path', { operation: 'toText', sourceProperty: 'a.b' }, [
		{ json: { a: { b: 'x' } } },
	], { host: 'run' }),
	// ---- Convert To File: toJson ----
	convert('toJson, each item', { operation: 'toJson', mode: 'each' }, [
		{ json: { a: 1, t: 'é' } },
		{ json: {} },
	]),
	convert(
		'toJson, each item, formatted, with a name, a mark and a field',
		{
			operation: 'toJson',
			mode: 'each',
			binaryPropertyName: 'out',
			options: { format: true, fileName: 'data.json', addBOM: true },
		},
		[{ json: { a: { b: [1, 2] } } }],
	),
	convert(
		'toJson, each item, with a mark and an encoding',
		{ operation: 'toJson', mode: 'each', options: { encoding: 'utf8', addBOM: true } },
		[{ json: { a: 1 } }],
	),
	convert(
		'toBinary, version 1, text with a mark',
		{
			operation: 'toBinary',
			sourceProperty: 'b',
			options: { dataIsBase64: false, addBOM: true, encoding: 'utf8' },
		},
		[{ json: { b: 'a,b' } }],
		{ version: 1, host: 'run' },
	),
	convert('toJson, all items in one file is in the host', { operation: 'toJson' }, [{ json: { a: 1 } }], {
		host: 'static',
	}),
	// ---- Convert To File: toBinary ----
	convert('toBinary, text bytes', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: utf8('hello') } },
	]),
	convert('toBinary, PNG bytes: the type comes from the bytes', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: PNG } },
	]),
	convert(
		'toBinary, a MIME type and a file name',
		{
			operation: 'toBinary',
			sourceProperty: 'b',
			binaryPropertyName: 'img',
			options: { mimeType: 'image/png', fileName: 'dir/pic.png' },
		},
		[{ json: { b: PNG } }],
	),
	convert(
		'toBinary, a file name only',
		{ operation: 'toBinary', sourceProperty: 'b', options: { fileName: 'report.pdf' } },
		[{ json: { b: utf8('x') } }],
	),
	convert(
		'toBinary, a MIME type only',
		{ operation: 'toBinary', sourceProperty: 'b', options: { mimeType: 'application/pdf' } },
		[{ json: { b: utf8('x') } }],
	),
	convert('toBinary, white space, no padding, URL alphabet', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: ' aGVs\nbG8= ' } },
		{ json: { b: 'aGVsbG8' } },
		{ json: { b: '-_-_' } },
		{ json: { b: '' } },
	]),
	convert(
		'toBinary, version 1.2 takes the same forms',
		{ operation: 'toBinary', sourceProperty: 'b' },
		[{ json: { b: ' aGVs\nbG8= ' } }, { json: { b: 'aGVsbG8' } }, { json: { b: '-_-_' } }, { json: { b: '' } }],
		{ version: 1.2 },
	),
	convert('toBinary, text that is not base64', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: 'not base64!' } },
	]),
	...['not base64!', 'a', 'aGk=aGk=', 'aG=k', 'aGk===', 'aGk'].map((b) =>
		convert(`toBinary, version 1.2, ${JSON.stringify(b)}`, { operation: 'toBinary', sourceProperty: 'b' }, [
			{ json: { b } },
		], { version: 1.2 }),
	),
	convert(
		'toBinary, version 1.2, bad base64, continue',
		{ operation: 'toBinary', sourceProperty: 'b' },
		[{ json: { b: 'a' } }, { json: { b: 'aGk=' } }],
		{ version: 1.2, ...CONTINUE },
	),
	convert('toBinary, a number', { operation: 'toBinary', sourceProperty: 'b' }, [{ json: { b: 5 } }]),
	convert('toBinary, null', { operation: 'toBinary', sourceProperty: 'b' }, [{ json: { b: null } }]),
	convert('toBinary, a value that is not set', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: {} },
	]),
	convert(
		'toBinary, version 1, text',
		{ operation: 'toBinary', sourceProperty: 'b', options: { dataIsBase64: false, mimeType: 'text/csv' } },
		[{ json: { b: 'a,b' } }],
		{ version: 1 },
	),
	convert('toBinary, version 1, base64', { operation: 'toBinary', sourceProperty: 'b' }, [{ json: { b: PNG } }], {
		version: 1,
	}),
	convert('toBinary, a data URI', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: `data:image/png;base64,${PNG}` } },
	], { host: 'run' }),
	convert('toBinary, bytes as an array', { operation: 'toBinary', sourceProperty: 'b' }, [
		{ json: { b: [104, 105] } },
	], { host: 'run' }),
	convert('csv is in the host', {}, [{ json: { a: 1 } }], { host: 'static' }),
];

function workflow(c: Case) {
	const items = c.items.map((item) => (item.binary ? item : { json: item.json }));
	return {
		name: 'File nodes',
		nodes: [
			{ name: 'T', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
			{
				name: 'Items',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: { jsCode: `return ${JSON.stringify(items)};` },
			},
			{
				name: 'F',
				type: `n8n-nodes-base.${c.type}`,
				typeVersion: c.version ?? 1.1,
				position: [400, 0],
				parameters: c.parameters,
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'F', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

let backend: BinaryDataBackend | undefined;

/** The `binaryData` service over n8n-core, in the binary data mode `default` (as the oracle). */
function coreBackend(): BinaryDataBackend {
	if (backend) return backend;
	const core = createRequire(hostPackage)('n8n-core') as Core;
	backend = {
		read: async () => {
			throw new Error('The test has no stored file');
		},
		detect: (data) => core.detectBinaryEncoding(Buffer.from(data)) ?? null,
		store: async (data, fileName, mimeType) =>
			await core.prepareBinaryData(Buffer.from(data), '1', 'oracle', fileName, mimeType),
	};
	return backend;
}

interface ServiceCall {
	service: string;
	op: string;
	args?: Record<string, unknown>;
}

/** Runs the converted workflow; each `binaryData` call gets the answer of the service. */
async function runCompiled(source: string, c: Case) {
	const compiledItems = c.items.map((item) =>
		item.binary ? { ...item.json, $binary: item.binary } : item.json,
	);
	const effects: Record<string, unknown[]> = { Items: [compiledItems] };
	for (let round = 0; round < 50; round++) {
		const out = await runReference(source, { trigger: { body: {} }, now: 0, seed: 1, effects });
		const seen = new Map<string, number>();
		let added = false;
		for (const e of out.effects) {
			const k = seen.get(e.step) ?? 0;
			seen.set(e.step, k + 1);
			const list = (effects[e.step] ??= []);
			if (list[k] !== undefined) continue;
			if (e.kind === 'node') return { out, host: true };
			if (e.kind !== 'service') throw new Error(`An effect without an answer: ${e.kind} ${e.step}`);
			const answer = await runBinaryDataCall(coreBackend(), e.args as ServiceCall);
			if (!answer.ok) throw new Error(answer.error.message);
			list[k] = answer.result;
			added = true;
			break;
		}
		if (!added) return { out, host: false };
	}
	throw new Error('The service calls did not settle');
}

describe('file library nodes and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
			withBinary: true,
			emptyBinary: true,
		});
		const converted = convertWorkflow(workflow(c), { codeNodes: 'host' });
		expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
		if (c.host === 'static') {
			expect(converted.fallbackNodes).toContain('F');
			return;
		}
		expect(converted.fallbackNodes).not.toContain('F');
		const { out, host } = await runCompiled(converted.source, c);
		expect(host, 'the node runs in the fallback host').toBe(c.host === 'run');
		if (host) return;
		if (v1.error !== null) {
			expect(out.status).toBe('error');
			const failure = out.result as { message?: string; description?: string };
			expect(failure.message).toBe(v1.error);
			expect(failure.description).toBe(v1.errorDescription);
			return;
		}
		expect(out.status, JSON.stringify(out.result)).toBe('ok');
		expect((out.result as Record<string, unknown>).F).toEqual(v1.nodes.F?.[0] ?? []);
	});
});
