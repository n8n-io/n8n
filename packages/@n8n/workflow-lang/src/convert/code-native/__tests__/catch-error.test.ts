/**
 * `catch` blocks that read the error in native Code nodes, against n8n's real task runner.
 *
 * The oracle is the real task runner of v1 (`runner-oracle.ts`): each case runs as native
 * code in the bytecode VM and as a Code node in n8n's engine with its task runner process,
 * on the same items. The results (items, or the message of the error with the line that the
 * task runner adds) must be the same. A form that cannot be equal must be refused: the
 * translation blocks it and the Code node runs in the fallback host.
 *
 * The cases are made up. They need the built n8n CLI and task runner packages; without them
 * the suite is skipped.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
}

const ITEMS = [{ a: 1 }, { a: 2 }];

/** Each error that a native form can raise, and each read of it. */
const READS: Case[] = [
	{
		name: 'e.message and e.name of a TypeError on a read of undefined',
		code: 'try { items[0].json.zz.y; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }',
	},
	{
		name: 'e.message and e.name of a read on null',
		code: 'try { items[0].json.a.zz; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }',
	},
	{
		name: 'e.message and e.name of a thrown Error',
		code: "try { throw new Error('boom'); } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }",
	},
	{
		name: 'e.message and e.name of a thrown TypeError',
		code: "try { throw new TypeError('bad type'); } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }",
	},
	{
		name: 'e.message and e.name of a thrown string',
		code: "try { throw 'just text'; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }",
	},
	{
		name: 'e.message and e.name of a thrown number',
		code: 'try { throw 42; } catch (e) { return [{ json: { message: e.message, name: e.name } }]; }',
	},
	{
		name: 'e.message of JSON.parse',
		code: "try { JSON.parse('x'); } catch (e) { return [{ json: { message: e.message } }]; }",
	},
	{
		name: 'e.message of JSON.parse of a bad literal',
		code: 'try { JSON.parse(\'{"a":}\'); } catch (e) { return [{ json: { message: e.message } }]; }',
	},
	{
		name: 'String(e) and the template of a TypeError',
		code: 'try { items[0].json.zz.y; } catch (e) { return [{ json: { text: String(e), template: `${e}`, own: e.toString() } }]; }',
	},
	{
		name: 'String(e) and the template of a thrown Error',
		code: "try { throw new Error('boom'); } catch (e) { return [{ json: { text: String(e), template: `$" + "{e}`, own: e.toString() } }]; }",
	},
	{
		name: 'String(e) of a thrown string and a concat',
		code: "try { throw 'just text'; } catch (e) { return [{ json: { text: String(e), concat: 'prefix: ' + e } }]; }",
	},
	{
		name: 'String(e) of a thrown object without a message',
		code: 'try { throw { a: 1 }; } catch (e) { return [{ json: { text: String(e) } }]; }',
	},
	{
		name: 'a truthy test and typeof of the error',
		code: 'try { items[0].json.zz.y; } catch (e) { return [{ json: { truthy: e ? 1 : 0, kind: typeof e, not: !e } }]; }',
	},
	{
		name: 'a missing property of the error gives undefined',
		code: 'try { items[0].json.zz.y; } catch (e) { return [{ json: { code: e.code ?? null, extra: e.extra ?? null } }]; }',
	},
	{
		name: 'rethrow of a TypeError',
		code: 'const a = 1;\ntry {\n  items[0].json.zz.y;\n} catch (e) {\n  throw e;\n}',
	},
	{
		name: 'rethrow of a thrown Error',
		code: "try { throw new Error('kept'); } catch (e) { throw e; }",
	},
	{
		name: 'rethrow of a thrown string',
		code: "try { throw 'kept text'; } catch (e) { throw e; }",
	},
	{
		name: 'catch in each mode reads the message',
		code: 'try { const v = $json.zz.y; return { json: { v } }; } catch (e) { return { json: { message: e.message } }; }',
		mode: 'each',
	},
	{
		name: 'catch in each mode gives String(e)',
		code: 'try { const v = $json.zz.y; return { json: { v } }; } catch (e) { return { json: { text: String(e) } }; }',
		mode: 'each',
	},
	{
		name: 'a caught error and a throw of a new Error with its message',
		code: "try { items[0].json.zz.y; } catch (e) { throw new Error('wrapped: ' + e.message); }",
	},
];

/** Runs both sides and requires the same result. */
async function same(c: Case): Promise<void> {
	const items = ITEMS;
	const mode = c.mode ?? 'all';
	const runner = await runnerCode(c.code, mode, items);
	expect(nativeCode(c.code, mode, items)).toEqual(runner);
}

describe.skipIf(!taskRunnerAvailable())('native Code nodes against the task runner: catch reads the error', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(READS)('gives the same result or error as v1: $name', async (c) => {
		await same(c);
	}, 60_000);
});

/** Forms that cannot be equal: the translation must refuse them. */
const REFUSED: Array<[string, string]> = [
	['a read of e.stack', 'try { items[0].json.zz.y; } catch (e) { return [{ json: { s: e.stack } }]; }'],
	[
		'a read of e.constructor',
		'try { items[0].json.zz.y; } catch (e) { return [{ json: { c: e.constructor } }]; }',
	],
	['the error as a value', 'try { items[0].json.zz.y; } catch (e) { return [{ json: { e } }]; }'],
	[
		'a shorthand of the error',
		'try { items[0].json.zz.y; } catch (e) { return [{ json: { e } }]; }',
	],
	[
		'a write to e.name',
		"try {\n  items[0].json.zz.y;\n} catch (e) {\n  e.name = 'Custom';\n  throw e;\n}",
	],
	[
		'a method of the error',
		'try { items[0].json.zz.y; } catch (e) { return [{ json: { s: e.hasOwnProperty("x") } }]; }',
	],
	[
		'the error as JSON',
		'try { items[0].json.zz.y; } catch (e) { return [{ json: { s: JSON.stringify(e) } }]; }',
	],
];

describe('catch reads the error: forms that must stay in the host', () => {
	it.each(REFUSED)('refuses %s', (_, code) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false, timezone: 'system' });
		expect(t.ok).toBe(false);
		if (!t.ok) expect(t.blockers.map((b) => b.feature)).toContain('catch reads the error');
	});
});