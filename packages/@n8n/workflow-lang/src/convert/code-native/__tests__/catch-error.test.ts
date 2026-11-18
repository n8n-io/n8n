/**
 * `catch` blocks that read the error in native Code nodes.
 *
 * The fallback host runs the code with n8n's v1 sandbox. The native code runs
 * in the bytecode VM. The results (items or error) must be equal, and a form
 * that cannot be equal (`e.stack`, line numbers) must keep the node in the host.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode, eachItemCode } from '../../code-node.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const hostDist = join(here, '../../../../../workflow-fallback-host/dist');

type Outcome = { ok: true; value: unknown } | { ok: false; error: string };

/** Runs `code` through the fallback host (v1 behaviour). */
async function host(code: string, mode: CodeMode): Promise<Outcome> {
	hostRunners();
	const req = createRequire(join(hostDist, 'index.js'));
	const mod = req(join(hostDist, 'code-step.js')) as {
		runCodeStepAsync: (args: unknown) => Promise<unknown>;
		parseCodeStepArgs: (args: unknown) => unknown;
	};
	const body = mode === 'each' ? eachItemCode(code, false, false) : allItemsCode(code, false, false);
	try {
		const value = await mod.runCodeStepAsync(
			mod.parseCodeStepArgs({ name: 'code', code: body, items: [{ a: 1 }] }),
		);
		return { ok: true, value };
	} catch (e) {
		return { ok: false, error: String(e) };
	}
}

/** Runs `code` natively in the bytecode VM. */
function native(code: string, mode: CodeMode): Outcome {
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

/** True when `translateCode` blocks the code. */
function blocked(code: string): boolean {
	const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
	return !t.ok;
}

/** Runs both sides and compares. */
async function same(code: string, mode: CodeMode = 'all'): Promise<OutcomeResult> {
	const h = await host(code, mode);
	const n = native(code, mode);
	expect(resultOf(n)).toEqual(resultOf(h));
	return resultOf(h);
}

describe('catch reads the error: message, name, and text', () => {
	it('reads e.message and e.name of a TypeError', async () => {
		const code = `try { items[0].json.zz.y; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }`;
		await same(code);
	});

	it('reads e.message and e.name of a thrown Error', async () => {
		const code = "try { throw new Error('boom'); } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }";
		await same(code);
	});

	it('reads e.message and e.name of a thrown string', async () => {
		const code = "try { throw 'just text'; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }";
		await same(code);
	});

	it('reads e.message of JSON.parse', async () => {
		const code = "try { JSON.parse('x'); } catch (e) { return [{ json: { message: e.message } }]; }";
		await same(code);
	});

	it('reads String(e) of a TypeError', async () => {
		const code = 'try { items[0].json.zz.y; } catch (e) { return [{ json: { text: String(e), template: `${e}` } }]; }';
		await same(code);
	});

	it('reads String(e) of a thrown Error', async () => {
		const code = "try { throw new Error('boom'); } catch (e) { return [{ json: { text: String(e), template: `$" + "{e}` } }]; }";
		await same(code);
	});

	it('reads String(e) of a thrown string', async () => {
		const code = "try { throw 'just text'; } catch (e) { return [{ json: { text: String(e), concat: 'prefix: ' + e } }]; }";
		await same(code);
	});

	it('rethrows the error of a TypeError', async () => {
		const code = 'try { items[0].json.zz.y; } catch (e) { throw e; }';
		const h = await host(code, 'all');
		const n = native(code, 'all');
		expect(h.ok).toBe(false);
		expect(n.ok).toBe(false);
		// The host prefixes with "ERROR: ". Compare the suffix.
		if (!h.ok && !n.ok) {
			expect(h.error).toContain(n.error);
		}
	});

	it('rethrows a thrown Error', async () => {
		const code = "try { throw new Error('boom'); } catch (e) { throw e; }";
		const h = await host(code, 'all');
		const n = native(code, 'all');
		expect(h.ok).toBe(false);
		expect(n.ok).toBe(false);
		if (!h.ok && !n.ok) {
			expect(h.error).toContain(n.error);
		}
	});

	it('catches and returns the error in each mode', async () => {
		const code = 'try { const v = $json.zz.y; return { json: { v } }; } catch (e) { return { json: { message: e.message } }; }';
		await same(code, 'each');
	});

	it('catches and returns String(e) in each mode', async () => {
		const code = 'try { const v = $json.zz.y; return { json: { v } }; } catch (e) { return { json: { text: String(e) } }; }';
		await same(code, 'each');
	});
});

describe('catch reads the error: forms kept in the host', () => {
	it('keeps a catch that reads e.stack in the host', () => {
		const code = 'try { items[0].json.zz.y; } catch (e) { return [{ json: { s: e.stack } }]; }';
		expect(blocked(code)).toBe(true);
	});

	it('keeps a catch that reads e.constructor in the host', () => {
		const code = 'try { items[0].json.zz.y; } catch (e) { return [{ json: { c: e.constructor } }]; }';
		expect(blocked(code)).toBe(true);
	});

	it('keeps a catch that uses the error as a value in the host', () => {
		const code = 'try { items[0].json.zz.y; } catch (e) { return [{ json: { e } }]; }';
		expect(blocked(code)).toBe(true);
	});

	it('keeps a write to e.name in the host', () => {
		const code = "try {\n  items[0].json.zz.y;\n} catch (e) {\n  e.name = 'CustomName';\n  throw e;\n}";
		expect(blocked(code)).toBe(true);
	});

	it('keeps a throw of a new Error that reads e.message in the host', () => {
		const code = "try { items[0].json.zz.y; } catch (e) { throw new Error('wrapped: ' + e.message); }";
		expect(blocked(code)).toBe(false);
	});
});