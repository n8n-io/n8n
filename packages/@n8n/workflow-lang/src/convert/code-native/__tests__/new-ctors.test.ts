/**
 * `new` constructors in native Code nodes.
 *
 * The fallback host runs the code with n8n's v1 sandbox. The native code runs
 * in the bytecode VM. The results must be equal, and a constructor with no
 * exact native form must keep the node in the host.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode } from '../../code-node.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const hostDist = join(here, '../../../../../workflow-fallback-host/dist');

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

async function host(code: string): Promise<Outcome> {
	hostRunners();
	const req = createRequire(join(hostDist, 'index.js'));
	const mod = req(join(hostDist, 'code-step.js')) as {
		runCodeStepAsync: (args: unknown) => Promise<unknown>;
		parseCodeStepArgs: (args: unknown) => unknown;
	};
	const body = allItemsCode(code, false, false);
	try {
		const value = await mod.runCodeStepAsync(
			mod.parseCodeStepArgs({ name: 'code', code: body, items: [{ a: 1 }] }),
		);
		return { ok: true, value };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
}

function native(code: string, mode: CodeMode = 'all'): Outcome {
	const t = translateCode({ code, mode, kind: 'code', hasNode: () => false, timezone: 'system' });
	if (!t.ok)
		throw new Error(`blocked: ${t.blockers.map((b) => `${b.feature}: ${b.message}`).join(', ')}`);
	const c = checkTranslation(t.translation, mode);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: { body: { input: [{ a: 1 }], nodes: [] } },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	if (out.status === 'ok') return { ok: true, value: out.result as unknown };
	const r: unknown = out.result;
	const message =
		typeof r === 'object' && r !== null ? String(Reflect.get(r, 'message')) : String(r);
	return { ok: false, error: message };
}

type OutcomeResult = { ok: true; value: unknown[] } | { ok: false; error: string };
function resultOf(out: Outcome): OutcomeResult {
	if (out.ok) return { ok: true, value: out.value as unknown[] };
	return out;
}

function blocked(code: string): boolean {
	const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
	return !t.ok;
}

async function same(code: string): Promise<OutcomeResult> {
	const h = await host(code);
	const n = native(code);
	expect(resultOf(n)).toEqual(resultOf(h));
	return resultOf(h);
}

describe('new constructors with exact native forms', () => {
	it('new Map() with get, has, size', async () => {
		const code = 'const m = new Map([["a", 1], ["b", 2]]); return [{ json: { a: m.get("a"), hasB: m.has("b"), hasC: m.has("c"), size: m.size } }];';
		await same(code);
	});

	it('new Map() empty with set', async () => {
		const code = 'const m = new Map(); m.set("k", "v"); m.set(1, true); return [{ json: { k: m.get("k"), n: m.get(1), size: m.size } }];';
		await same(code);
	});

	it('new Set() with add, has, size, delete', async () => {
		const code = 'const s = new Set([1, 2]); s.add(3); s.delete(2); return [{ json: { has1: s.has(1), has2: s.has(2), has3: s.has(3), size: s.size } }];';
		await same(code);
	});

	it('new Set() empty', async () => {
		const code = 'const s = new Set(); return [{ json: { size: s.size, has: s.has(1) } }];';
		await same(code);
	});

	it('new Error() with message and name', async () => {
		const code = "const e = new Error('boom'); return [{ json: { message: e.message, name: e.name } }];";
		await same(code);
	});

	it('new Error() with no argument', async () => {
		const code = 'const e = new Error(); return [{ json: { message: e.message, name: e.name } }];';
		await same(code);
	});

	it('new TypeError() with message', async () => {
		const code = "const e = new TypeError('bad type'); return [{ json: { message: e.message, name: e.name } }];";
		await same(code);
	});

	it('new RangeError() with message', async () => {
		const code = "const e = new RangeError('bad range'); return [{ json: { message: e.message, name: e.name } }];";
		await same(code);
	});

	it('new RegExp() with string literal pattern and flags', async () => {
		const code = "const r = new RegExp('ab+c', 'i'); return [{ json: { t: r.test('aBc'), m: 'aabbcc'.match(r) !== null } }];";
		await same(code);
	});

	it('new RegExp() with no flags', async () => {
		const code = "const r = new RegExp('\\\\d+'); return [{ json: { t: r.test('123'), f: r.test('abc') } }];";
		await same(code);
	});

	it('new RegExp() with computed pattern is allowed', async () => {
		const code = "const r = new RegExp(items[0].json.a + 'c', 'i'); return [{ json: { t: r.test('abc') } }];";
		await same(code);
	});
});

describe('new constructors kept in the host', () => {
	// `new Array()` and `new Object()` are blocked by the compile check (WL001).
	const compileBlocked = (code: string) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
		if (!t.ok) return false;
		const c = checkTranslation(t.translation, 'all');
		return !c.ok;
	};

	it('keeps new Array() in the host (WL001)', () => {
		const code = 'const a = new Array(3); return [{ json: { len: a.length } }];';
		expect(compileBlocked(code)).toBe(true);
	});

	it('keeps new Object() in the host (WL001)', () => {
		const code = 'const o = new Object(); return [{ json: { t: typeof o } }];';
		expect(compileBlocked(code)).toBe(true);
	});

	it('keeps new SyntaxError in the host (not in subset)', () => {
		const code = "const e = new SyntaxError('msg'); return [{ json: { m: e.message } }];";
		expect(blocked(code)).toBe(true);
	});
});