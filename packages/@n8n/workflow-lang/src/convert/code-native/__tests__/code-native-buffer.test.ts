/**
 * Buffer values of Code nodes: each case runs natively and in the fallback host (Node.js)
 * on the same items, and the results must be the same. The data is made up.
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

type Outcome = { ok: true; value: unknown } | { ok: false; error?: unknown };

// The fallback host allows `require('crypto')`, as a deployment of v1 that runs such code.
process.env.WF_FALLBACK_CODE_ALLOW_MODULES = 'crypto';

const base = (code: string, mode: CodeMode, traced: boolean) => ({
	code,
	mode,
	kind: 'code' as const,
	hasNode: () => false,
	timezone: 'system',
	allowedModules: ['crypto'],
	inlineBinary: true,
	traced,
});

function native(code: string, mode: CodeMode, input: unknown[], traced = false): Outcome {
	const t = translateCode(base(code, mode, traced));
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	const c = checkTranslation(t.translation, mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input, nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	return out.status === 'ok' ? { ok: true, value: out.result } : { ok: false, error: out.result };
}

function host(code: string, mode: CodeMode, input: unknown[]): Outcome {
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false);
	try {
		return { ok: true, value: hostRunners().code({ name: 'code', code: body, items: input }) };
	} catch {
		return { ok: false };
	}
}

function blockersOf(code: string, options: { inlineBinary?: boolean } = {}): string[] {
	const t = translateCode({ ...base(code, 'all', false), inlineBinary: options.inlineBinary });
	return t.ok ? [] : t.blockers.map((b) => b.feature);
}

/** The plain form and the traced form give the result of the host. */
const same = (code: string, input: unknown[], mode: CodeMode = 'all') => {
	const h = host(code, mode, input);
	const n = native(code, mode, input);
	expect(n.ok, JSON.stringify(n)).toBe(h.ok);
	if (h.ok && n.ok) expect(JSON.stringify(n.value)).toBe(JSON.stringify(h.value));
	const traced = native(code, mode, input, true);
	expect(traced.ok, JSON.stringify(traced)).toBe(h.ok);
	if (h.ok && traced.ok) expect(JSON.stringify(traced.value)).toBe(JSON.stringify(h.value));
	return n;
};

/** Seeded inputs: text with surrogates, random bytes as latin1 text, base64 (also invalid) and hex. */
function samples(count: number): Array<Record<string, unknown>> {
	let seed = 11;
	const rand = (n: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % n;
	};
	const pick = (s: string) => s.charAt(rand(s.length));
	const out: Array<Record<string, unknown>> = [];
	for (let k = 0; k < count; k++) {
		let t = '';
		for (let j = rand(14); j > 0; j--) t += pick('aZ09+/=-_ é😀\ud800\n%ÿĀ');
		let bytes = '';
		for (let j = rand(12); j > 0; j--) bytes += String.fromCharCode(rand(256));
		const list: unknown[] = [];
		for (let j = rand(6); j > 0; j--)
			list.push([rand(600) - 100, '7', 1.9, -1.9, null, 'x'][rand(6)]);
		out.push({
			t,
			bytes,
			list,
			b64: Buffer.from(bytes, 'latin1').toString('base64') + pick('=A!'),
			hex: Buffer.from(bytes, 'latin1').toString('hex') + pick('0g'),
			a: rand(9) - 4,
			b: rand(9) - 4,
		});
	}
	return out;
}

describe('Buffer values', () => {
	it('converts between the encodings of Node.js', () => {
		const code = `return items.map((i) => {
	const j = i.json;
	const u = Buffer.from(j.t);
	const l = Buffer.from(j.bytes, 'latin1');
	const out = {};
	for (const e of ['utf8', 'UTF-8', 'latin1', 'binary', 'ascii', 'utf16le', 'ucs2', 'UCS-2', 'base64', 'base64url', 'hex']) {
		out['u' + e] = u.toString(e);
		out['l' + e] = l.toString(e);
		out['t' + e] = Buffer.from(j.t, e).toString('hex');
		out['b' + e] = Buffer.from(j.b64, e).toString('base64');
		out['n' + e] = Buffer.byteLength(j.t, e);
		out['m' + e] = Buffer.byteLength(j.b64, e);
	}
	out.len = u.length;
	out.first = u[0];
	out.past = u[400];
	out.text = l.toString();
	out.count = Buffer.byteLength(j.t);
	out.hex = Buffer.from(j.hex, 'hex').toString('latin1');
	out.empty = Buffer.from('', 'hex').toString('none');
	return { json: out };
});`;
		expect(same(code, samples(120)).ok).toBe(true);
	});

	it('makes Buffers from lists, Buffers and array-like objects, and joins and cuts them', () => {
		const code = `return items.map((i) => {
	const j = i.json;
	const fromList = Buffer.from(j.list);
	const copy = Buffer.from(fromList);
	const like = Buffer.from({ length: 3, 0: 65, 1: '66', 2: 300 });
	const json = Buffer.from({ type: 'Buffer', data: [1, 2, 258] });
	const odd = Buffer.from({ length: 'x' });
	const l = Buffer.from(j.bytes, 'binary');
	const all = Buffer.concat([fromList, l, Buffer.from(j.t, 'utf8'), like]);
	const cut = all.slice(j.a, j.b);
	const part = all.subarray(j.a);
	const tail = cut.slice(1).subarray(0, -1);
	return { json: {
		list: fromList.toString('hex'), copy: copy.equals(fromList), like: like.toString(), json: json.toJSON(), odd: odd.length,
		all: all.toString('base64'), n: all.length, cut: cut.toString('hex'), part: part.toString('hex'), tail: tail.toString('hex'),
		whole: all.slice().equals(all), none: all.slice(undefined, null).length, text: all.slice('1', '3').toString('hex'),
		same: cut.equals(part), is: Buffer.isBuffer(cut), again: Buffer.from(copy).toString('hex'), b64: Buffer.from(cut, 'hex').toString('base64'), size: Buffer.from(j.t).length, shape: Buffer.concat([cut, part]).toJSON(),
	} };
});`;
		expect(same(code, samples(120)).ok).toBe(true);
	});

	it('fails as Node.js does for a value or an encoding that Buffer does not take', () => {
		const items = [{ t: 'abc', n: 5 }];
		for (const code of [
			"const b = Buffer.from(items[0].json.t, 'utf9'); return [{ json: { n: b.length } }];",
			"const b = Buffer.from(items[0].json.t); return [{ json: { t: b.toString('utf9') } }];",
			'const b = Buffer.from(items[0].json.n); return [{ json: { n: b.length } }];',
			'const b = Buffer.from(items[0].json.zz); return [{ json: { n: b.length } }];',
			'return [{ json: { n: Buffer.byteLength(items[0].json.n) } }];',
		]) {
			expect(same(code, items).ok).toBe(false);
		}
		// Node.js does not read the encoding of an empty Buffer, and takes an encoding that is no text as UTF-8.
		expect(
			same(
				"const b = Buffer.from(''); const c = Buffer.from(items[0].json.t, 5); return [{ json: { t: b.toString('utf9'), c: c.toString(), n: Buffer.byteLength(items[0].json.t, 'utf9') } }];",
				items,
			).ok,
		).toBe(true);
	});

	it('keeps a Buffer in the host when the code can see its form', () => {
		for (const code of [
			"const b = Buffer.from('a'); return [{ json: { b } }];",
			"const b = Buffer.from('a'); return [{ json: { b: [b] } }];",
			"const b = Buffer.from('a'); return [{ json: { t: typeof b } }];",
			"const b = Buffer.from('a'); return [{ json: { t: `${b}` } }];",
			"const b = Buffer.from('a'); b[0] = 66; return [{ json: { t: b.toString() } }];",
			"const b = Buffer.from('a'); return [{ json: { t: b.toString('hex', 0, 1) } }];",
			"const f = (x) => x.toString('hex'); return [{ json: { t: f(Buffer.from('a')) } }];",
			"let b = Buffer.from('a'); return [{ json: { t: b.toString('hex') } }];",
			"const b = Buffer.from('a'); return [{ json: { t: b.readUInt8(0) } }];",
			"const b = Buffer.from('a'); return [{ json: { t: Buffer.isBuffer(items) } }];",
			'const b = Buffer.alloc(2); return [{ json: { t: b.length } }];',
		]) {
			expect(blockersOf(code)).toContain('Buffer');
		}
		expect(
			blockersOf(
				"const b = Buffer.from('a'); try { return [{ json: { t: b.toString('hex') } }]; } catch (e) { return [{ json: { m: e.message } }]; }",
			),
		).toContain('catch reads the error');
	});
});

describe('hashes with Buffers', () => {
	it('gives the SHA-384 and SHA-512 digests and HMACs of Node.js', () => {
		const code = `const crypto = require('crypto');
return items.map((i) => {
	const j = i.json;
	const out = {};
	for (const t of [j.t, j.bytes, j.t.repeat(12)]) {
		out['a' + t.length] = crypto.createHash('sha512').update(t).digest('hex');
		out['b' + t.length] = crypto.createHash('sha384').update(t).digest('base64');
		out['c' + t.length] = crypto.createHmac('sha512', j.bytes + 'k').update(t).digest('hex');
		out['d' + t.length] = crypto.createHmac('sha384', t + 'k').update(j.t).digest('base64url');
		out['e' + t.length] = crypto.createHmac('SHA512', (t + 'k').repeat(9)).update(j.t).update(t).digest('hex');
	}
	for (let n = 105; n < 135; n += 4) out['p' + n] = crypto.createHash('sha512').update('x'.repeat(n)).digest('hex') + crypto.createHash('sha384').update('y'.repeat(n + 1)).digest('hex');
	return { json: out };
});`;
		expect(same(code, samples(3)).ok).toBe(true);
	}, 60_000);

	it('takes Buffers as data and as a key, gives a digest as a Buffer, and compares in constant time', () => {
		const code = `const { createHash, createHmac, timingSafeEqual } = require('crypto');
return items.map((i) => {
	const j = i.json;
	const key = Buffer.from(j.bytes + 'k', 'latin1');
	const raw = createHmac('sha256', key).update(Buffer.from(j.t)).digest();
	const again = Buffer.from(createHmac('sha256', key).update(j.t).digest('hex'), 'hex');
	const md = createHash('md5').update(Buffer.concat([key, raw])).digest();
	const given = Buffer.from(j.b64, 'base64');
	return { json: {
		hex: raw.toString('hex'), b64: raw.toString('base64'), n: raw.length, md: md.toString('hex'),
		ok: timingSafeEqual(raw, again), other: given.length === raw.length ? timingSafeEqual(given, raw) : null,
		half: timingSafeEqual(raw.slice(0, 16), again.subarray(0, 16)), long: createHmac('sha512', Buffer.concat([raw, raw, raw, raw, raw])).update('x').digest('hex'),
	} };
});`;
		expect(same(code, samples(15)).ok).toBe(true);
	}, 60_000);

	it('fails as Node.js does for Buffers of different lengths', () => {
		const code =
			"const crypto = require('crypto'); const a = Buffer.from('abc'); const b = Buffer.from('ab'); return [{ json: { ok: crypto.timingSafeEqual(a, b) } }];";
		expect(same(code, [{}]).ok).toBe(false);
	});

	it('keeps other uses of the crypto module in the host', () => {
		for (const code of [
			"const crypto = require('crypto'); return [{ json: { ok: crypto.timingSafeEqual('a', 'a') } }];",
			"const crypto = require('crypto'); return [{ json: { ok: crypto.createHash('sha512-256').update('a').digest('hex') } }];",
			"const crypto = require('crypto'); return [{ json: { ok: crypto.randomBytes(4).toString('hex') } }];",
		]) {
			expect(blockersOf(code)).toContain('require');
		}
	});
});

describe('this.helpers.getBinaryDataBuffer', () => {
	const file = (text: string) => ({
		data: Buffer.from(text, 'utf8').toString('base64'),
		mimeType: 'text/plain',
		fileName: 'a.txt',
	});
	const items = [
		{ id: 1, $binary: { data: file('first é\nline'), other: file('{"a":1}') } },
		{ id: 2, $binary: { data: file('') } },
	];

	it('reads the bytes of binary data that an item holds as base64 text', () => {
		const code = `const out = [];
for (let k = 0; k < items.length; k++) {
	const buf = await this.helpers.getBinaryDataBuffer(k, 'data');
	const text = buf.toString('utf8');
	out.push({ json: { text, n: buf.length, b64: buf.toString('base64'), lines: text.split('\\n').length }, binary: items[k].binary });
}
const other = JSON.parse((await this.helpers.getBinaryDataBuffer(0, 'other')).toString());
out.push({ json: other });
return out;`;
		expect(same(code, items).ok).toBe(true);
	});

	it('reads the bytes of the current item in the mode for each item', () => {
		const code =
			"const buf = await this.helpers.getBinaryDataBuffer($itemIndex, 'data'); return { json: { text: buf.toString(), id: $json.id } };";
		expect(same(code, items, 'each').ok).toBe(true);
	});

	it('stays in the host when the bytes can be in the binary data store', () => {
		const code =
			"const buf = await this.helpers.getBinaryDataBuffer(0, 'data'); return [{ json: { text: buf.toString() } }];";
		expect(blockersOf(code, { inlineBinary: false })).toContain('binary data of a stored file');
		expect(blockersOf(code, { inlineBinary: true })).toEqual([]);
		expect(
			blockersOf("const p = this.helpers.getBinaryDataBuffer(0, 'data'); return [{ json: {} }];", {
				inlineBinary: true,
			}),
		).not.toEqual([]);
	});
});
