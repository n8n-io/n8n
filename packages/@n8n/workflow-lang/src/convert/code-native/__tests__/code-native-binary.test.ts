/**
 * Binary data in native Code nodes. The fallback host gives each binary entry of a code
 * result both size members (`binaryWithSizes` of its `binary.ts`); native code that can make
 * or change binary data does the same (`codeBinarySizes`). Each case runs natively and in
 * the host on the same items.
 */
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

useUtc();

type Outcome = { ok: true; value: unknown } | { ok: false };

function translated(code: string, mode: CodeMode) {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	return t.translation;
}

function native(code: string, mode: CodeMode, input: unknown[]): Outcome {
	const c = checkTranslation(translated(code, mode), mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	return out.status === 'ok' ? { ok: true, value: out.result } : { ok: false };
}

function host(code: string, mode: CodeMode, input: unknown[]): Outcome {
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false);
	try {
		return { ok: true, value: hostRunners().code({ name: 'code', code: body, items: input }) };
	} catch {
		return { ok: false };
	}
}

/** The same result, with the same order of the members. */
const same = (code: string, input: unknown[], mode: CodeMode = 'all') => {
	const n = native(code, mode, input);
	const h = host(code, mode, input);
	expect(JSON.stringify(n)).toBe(JSON.stringify(h));
	return n;
};

/** An entry as an item holds it after a host step: base64 data with both sizes. */
const file = {
	data: 'aGVsbG8=',
	mimeType: 'text/plain',
	fileName: 'hello.txt',
	bytes: 5,
	fileSize: '5 B',
};
/** A handle of the runtime (spec 7.1): the bytes are in the store. */
const stored = {
	id: 'filesystem-v2:workflows/w/executions/1/binary_data/abc',
	data: 'filesystem-v2',
	mimeType: 'image/png',
	fileType: 'image',
	fileName: 'chart.png',
	fileExtension: 'png',
	fileSize: '1.34 kB',
	bytes: 1337,
};
const rows = [
	{ id: 1, name: 'a', $binary: { data: file } },
	{ id: 2, name: 'b', $binary: { data: stored, second: file } },
	{ id: 3, name: 'c' },
];

describe('binary data that the code passes on', () => {
	it.each([
		[
			'the binary of each item',
			'return items.map((i) => ({ json: { id: i.json.id }, binary: i.binary }));',
		],
		[
			'the binary of the first item',
			'return [{ json: { n: items.length }, binary: items[0].binary }];',
		],
		['a copy of the map', 'return items.map((i) => ({ json: i.json, binary: { ...i.binary } }));'],
		[
			'the map or an empty map',
			'return items.map((i) => ({ json: i.json, binary: i.binary || {} }));',
		],
		[
			'entries with other names',
			'return items.filter((i) => i.binary).map((i) => ({ json: {}, binary: { attachment: i.binary.data, [i.json.name]: i.binary.second } }));',
		],
		[
			'the entries of all items in one item',
			'const binary = {}; for (const i of items) for (const k of Object.keys(i.binary || {})) binary[k + i.json.id] = i.binary[k]; return [{ json: { keys: Object.keys(binary) }, binary }];',
		],
		['an item without its binary', 'for (const i of items) delete i.binary; return items;'],
		[
			'an item with one entry less',
			'for (const i of items) if (i.binary) delete i.binary.second; return items;',
		],
		[
			'a destructured item',
			'return items.map(({ json, binary }) => ({ json: { ...json, has: binary !== undefined }, binary }));',
		],
		['a binary that moves to another item', 'items[2].binary = items[1].binary; return items;'],
		['items without json', 'return items.slice(0, 2).map((i) => ({ binary: i.binary }));'],
	])('gives %s as the host does', (_, code) => {
		expect(translated(code, 'all').writesBinary).toBe(true);
		expect(same(code, rows).ok).toBe(true);
	});

	it('passes the binary of the item in "each item" mode', () => {
		const code =
			'return { json: { id: $json.id, name: item.binary?.data?.fileName }, binary: item.binary };';
		expect(same(code, rows, 'each').ok).toBe(true);
	});

	it('reads the members of an entry without a change of the result form', () => {
		const code =
			"return items.map((i) => ({ json: { id: i.json.id, name: i.binary?.data?.fileName, type: i.binary?.data.mimeType, size: i.binary?.['data'].fileSize, ext: i.binary?.data?.fileExtension ?? null } }));";
		expect(translated(code, 'all').writesBinary).toBe(false);
		expect(same(code, rows).ok).toBe(true);
	});

	it.each([
		[
			'the map as a value',
			'const b = items[0].binary; return [{ json: { keys: Object.keys(b) } }];',
		],
		['an entry as a value', 'const e = items[0].binary.data; e.fileName = "x"; return items;'],
		['a write of a member', 'items[0].binary.data.fileName = "x"; return items;'],
		['a delete of a member', 'delete items[0].binary.data.bytes; return items;'],
		[
			'a new entry',
			"items[0].binary.extra = { data: 'aGk=', mimeType: 'text/plain' }; return items;",
		],
		[
			'a call on an entry',
			"const own = items[0].binary.data.hasOwnProperty('bytes'); return [{ json: { own }, binary: items[0].binary }];",
		],
	])('gives the sizes after %s', (_, code) => {
		expect(translated(code, 'all').writesBinary).toBe(true);
		expect(same(code, rows).ok).toBe(true);
	});
});

describe('binary data that the code makes', () => {
	it('gives the sizes of base64 data as the host does', () => {
		let seed = 5;
		const rand = (n: number) => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed % n;
		};
		const input: unknown[] = [];
		for (let k = 0; k < 60; k++) {
			let bytes = '';
			for (let j = rand(40); j > 0; j--) bytes += String.fromCharCode(rand(256));
			let data = Buffer.from(bytes, 'latin1').toString(rand(4) === 0 ? 'base64url' : 'base64');
			// Text that is not base64: Node.js skips the characters that it does not know.
			if (rand(5) === 0)
				data = `${data.slice(0, rand(8))} \n${'%é='.charAt(rand(3))}${data.slice(3)}`;
			input.push({ data });
		}
		input.push(
			{ data: '' },
			{ data: '====' },
			{ data: 'filesystem-v2' },
			{ data: 5 },
			{ data: null },
		);
		const code =
			"return items.map((i) => ({ json: {}, binary: { file: { data: i.json.data, mimeType: 'application/octet-stream', fileName: 'f.bin' } } }));";
		expect(same(code, input).ok).toBe(true);
	});

	it('writes the size text as the host does', () => {
		const sizes: number[] = [
			0, 1, 999, 1000, 1001, 1004, 1005, 1006, 1234, 1500, 2000, 9994, 9995, 9996,
		];
		for (const base of [
			9.99, 9.995, 9.996, 10, 10.04, 10.05, 99.94, 99.95, 99.96, 100, 100.4, 100.5, 999.4, 999.5,
			999.9,
		]) {
			for (const unit of [1e3, 1e6, 1e9, 1e12])
				sizes.push(Math.round(base * unit), Math.round(base * unit) + 1);
		}
		sizes.push(
			1e15,
			9.994e14,
			9.995e14,
			1.2345e15,
			1.2355e15,
			9.996e17,
			1e18,
			123456789012345680000,
			1e21,
			1e30,
		);
		sizes.push(-5, -2000, 0.5, 1500.5, 999.9996);
		let seed = 9;
		for (let k = 0; k < 200; k++) {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			sizes.push(Math.floor(seed * 10 ** (k % 8)) % 10 ** (3 + (k % 13)));
		}
		const input = sizes.map((bytes) => ({ bytes }));
		const code =
			"return items.map((i) => ({ json: { bytes: i.json.bytes }, binary: { file: { data: 'aGk=', mimeType: 'text/plain', bytes: i.json.bytes } } }));";
		const n = same(code, input);
		expect(n.ok).toBe(true);
	});

	it.each([
		[
			'an entry with its own sizes',
			"{ data: 'aGk=', mimeType: 'text/plain', fileSize: 'two bytes', bytes: 2 }",
		],
		['an entry with a size text only', "{ data: 'aGk=', mimeType: 'text/plain', fileSize: 'x' }"],
		[
			'an entry with sizes of other types',
			"{ data: 'aGk=', mimeType: 'text/plain', fileSize: 7, bytes: '2' }",
		],
		['a value that is not an entry', "{ data: 'aGk=' }"],
		['a list as an entry', "['aGk=']"],
		['null as an entry', 'null'],
		['text as an entry', "'aGk='"],
	])('gives %s as the host does', (_, entry) => {
		const code = `return [{ json: { a: 1 }, binary: { first: ${entry}, second: { mimeType: 'a/b', data: 'QUJD', fileName: 'x' } } }, { binary: { only: ${entry} } }];`;
		same(code, [{}]);
	});

	it.each([
		[
			'one object with binary',
			"return { binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } };",
			'all',
		],
		[
			'an object with json and binary',
			"return { json: { a: 1 }, binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } };",
			'all',
		],
		['an empty binary map', 'return [{ json: { a: 1 }, binary: {} }];', 'all'],
		['a binary that is not an object', "return [{ json: { a: 1 }, binary: 'x' }];", 'all'],
		[
			'a result of "each item" mode',
			"return { json: { id: $json.id }, binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } };",
			'each',
		],
		[
			'a result of "each item" mode without json',
			"return { binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } };",
			'each',
		],
	] as Array<[string, string, CodeMode]>)('gives %s as the host does', (_, code, mode) => {
		same(code, rows, mode);
	});
});
