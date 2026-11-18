/**
 * `new` constructors in native Code nodes, checked against the real task runner.
 *
 * The oracle is the real task runner of v1 (`runner-oracle.ts`): each case runs native in
 * the bytecode VM and as a Code node in n8n's engine with its task runner process, on the
 * same items. The results must be equal. A constructor with no exact native form must be
 * refused: the translation or the compile check blocks it, and the node runs in the host.
 *
 * The cases are made up. Without the built n8n CLI and task runner packages the suite is
 * skipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { checkTranslation } from '../check.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

const ITEMS = [{ a: 1 }, { b: 2 }];

/** Constructors with a native form: the result must equal v1. */
const CONSTRUCTORS: Array<[string, string]> = [
	[
		'new Map of pairs, with get, has and size',
		'const m = new Map([["a", 1], ["b", 2]]); return [{ json: { a: m.get("a"), b: m.get("b"), none: m.get("z") ?? null, hasB: m.has("b"), hasZ: m.has("z"), size: m.size } }];',
	],
	[
		'new Map empty, filled with set',
		'const m = new Map(); m.set("k", "v"); m.set(1, true); return [{ json: { k: m.get("k"), one: m.get(1), size: m.size } }];',
	],
	[
		'new Set of values, with add, has, delete and size',
		'const s = new Set([1, 2]); s.add(3); s.delete(2); return [{ json: { has1: s.has(1), has2: s.has(2), has3: s.has(3), size: s.size } }];',
	],
	['new Set empty', 'const s = new Set(); return [{ json: { size: s.size, has: s.has(1) } }];'],
	[
		'new Error with a message',
		"const e = new Error('boom'); return [{ json: { message: e.message, name: e.name } }];",
	],
	[
		'new Error without an argument',
		'const e = new Error(); return [{ json: { message: e.message, name: e.name } }];',
	],
	[
		'new TypeError with a message',
		"const e = new TypeError('bad type'); return [{ json: { message: e.message, name: e.name } }];",
	],
	[
		'new RangeError with a message',
		"const e = new RangeError('bad range'); return [{ json: { message: e.message, name: e.name } }];",
	],
	[
		'new RegExp with a literal pattern and flags',
		"const r = new RegExp('ab+c', 'i'); return [{ json: { t: r.test('aBc'), f: r.test('x'), src: r.source, flags: r.flags } }];",
	],
	[
		'new RegExp with no flags',
		"const r = new RegExp('\\\\d+'); return [{ json: { t: r.test('123'), f: r.test('abc'), src: r.source } }];",
	],
	[
		'new RegExp with a computed pattern',
		"const r = new RegExp(items[0].json.a === 1 ? 'ab' : 'g', 'g'); return [{ json: { t: r.test('xaby'), g: r.flags } }];",
	],
	[
		'a Map and a Set built from an item',
		'const m = new Map([[items[0].json.a, 1]]); const s = new Set([items[0].json.a]); return [{ json: { m: m.get(items[0].json.a), has: s.has(items[0].json.a), size: s.size } }];',
	],
];

/** Runs native and v1 and requires the same result; throws when the native form is refused. */
async function same(code: string, mode: 'all' | 'each' = 'all'): Promise<void> {
	const runner = await runnerCode(code, mode, ITEMS);
	expect(nativeCode(code, mode, ITEMS)).toEqual(runner);
}

/** True when the translation or the compile check refuses the code. */
function refused(code: string, mode: 'all' | 'each' = 'all'): boolean {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok) return true;
	return !checkTranslation(t.translation, mode).ok;
}

describe.skipIf(!taskRunnerAvailable())('native Code nodes against the task runner: new constructors', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(CONSTRUCTORS)('gives the result of v1: %s', async (_, code) => {
		await same(code);
	}, 60_000);

	it('gives the result of v1 for a Map and a Set in each mode', async () => {
		const code =
			'const m = new Map([[$json.a, $json.b ?? 0]]); const s = new Set([$json.a]); return { json: { m: m.get($json.a), has: s.has($json.a), size: s.size } };';
		await same(code, 'each');
	}, 60_000);
});

describe('new constructors that must stay in the host', () => {
	it.each([
		['new Array with a length', 'const a = new Array(3); return [{ json: { len: a.length, el: a[0] ?? null } }];'],
		['new Object', 'const o = new Object(); return [{ json: { t: typeof o, keys: Object.keys(o).length } }];'],
		['new SyntaxError', "const e = new SyntaxError('msg'); return [{ json: { m: e.message } }];"],
		['new WeakMap', 'const w = new WeakMap(); return [{ json: { t: typeof w.set } }];'],
		[
			'String of a made Error',
			"const e = new Error('boom'); return [{ json: { t: String(e) } }];",
		],
		[
			'a template of a made Error',
			"const e = new RangeError('bad'); return [{ json: { t: `$" + "{e}` } }];",
		],
		[
			'a made Error in an item',
			"const e = new TypeError('bad'); return [{ json: { e } }];",
		],
		[
			'JSON of a made Error',
			"const e = new Error('boom'); return [{ json: { t: JSON.stringify(e) } }];",
		],
	])('refuses %s', (_, code) => {
		expect(refused(code)).toBe(true);
	});
});