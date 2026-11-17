/**
 * Native Code nodes in whole converted workflows: static data that the nodes
 * share, the error output, and values that a Set node in raw mode gives them.
 */
import { describe, expect, it } from 'vitest';

import { runReference } from '../../../reference/runner.ts';
import { convertWorkflow } from '../../index.ts';

const hook = {
	name: 'Hook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { path: 'a' },
};

function code(name: string, jsCode: string, extra: Record<string, unknown> = {}) {
	return {
		name,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [200, 0],
		parameters: { jsCode },
		...extra,
	};
}

const chain = (names: string[]) =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((n, k) => [n, { main: [[{ node: names[k + 1], type: 'main', index: 0 }]] }]),
	);

async function traced(wf: Record<string, unknown>, body: unknown = {}) {
	const out = convertWorkflow(wf, { trace: 'all' });
	expect(out.ok).toBe(true);
	const run = await runReference(out.source, {
		trigger: { body },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	const items = (name: string) => (run.trace ?? []).find((t) => t.step === name)?.items;
	return { out, run, items };
}

describe('native Code nodes in a workflow', () => {
	it('keeps a Code node with a Date in a list in the fallback host without Date values', () => {
		const wf = {
			name: 'Dates',
			nodes: [
				hook,
				code(
					'Dates',
					'return items.map((i) => { const a = [new Date(i.json.t)]; return { json: { ms: a[0] - 1 } }; });',
				),
			],
			connections: chain(['Hook', 'Dates']),
		};
		expect(convertWorkflow(wf).fallbackNodes).toEqual(['Dates']);
	});

	it('shares the workflow static data between the nodes of an execution', async () => {
		const wf = {
			name: 'Static',
			nodes: [
				hook,
				code(
					'Start',
					"const s = $getWorkflowStaticData('global'); s.startedAt = 'then'; s.n = 2; return [{ json: {} }];",
				),
				code(
					'Report',
					"const s = $getWorkflowStaticData('global'); return [{ json: { startedAt: s.startedAt, n: s.n } }];",
				),
			],
			connections: chain(['Hook', 'Start', 'Report']),
		};
		const { out, items } = await traced(wf);
		expect(out.fallbackNodes).toEqual([]);
		expect(items('Report')).toEqual([{ startedAt: 'then', n: 2 }]);
	});

	it('gives one item with the error message on the error output, as v1', async () => {
		const wf = {
			name: 'Errors',
			nodes: [
				hook,
				code('Check', "throw new Error('missing id');", { onError: 'continueErrorOutput' }),
				code('Log', 'return $input.all();'),
			],
			connections: {
				Hook: { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
				Check: { main: [[], [{ node: 'Log', type: 'main', index: 0 }]] },
			},
		};
		const { out, items } = await traced(wf, { id: 1 });
		expect(out.fallbackNodes).toEqual([]);
		// As v1's task runner: the message has the line, and the item is the first input item with it.
		expect(items('Log')).toEqual([{ params: {}, body: { id: 1 }, error: 'missing id [line 1]' }]);
	});

	it('keeps "each item" mode with an error setting that continues in the host', () => {
		const wf = {
			name: 'Each',
			nodes: [
				hook,
				code('Check', "throw new Error('x');", {
					onError: 'continueRegularOutput',
					parameters: { jsCode: "throw new Error('x');", mode: 'runOnceForEachItem' },
				}),
			],
			connections: chain(['Hook', 'Check']),
		};
		expect(convertWorkflow(wf).fallbackNodes).toContain('Check');
	});

	it('reads "undefined" from a raw Set part that has no value, as v1', async () => {
		const wf = {
			name: 'Raw',
			nodes: [
				hook,
				{
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [200, 0],
					parameters: {
						mode: 'raw',
						jsonOutput: '={\n  "id": "{{ $json.body.list[0].node.id }}"\n}',
						options: {},
					},
				},
				code(
					'Filter',
					"return $input.all().filter((i) => i.json.id != 'undefined').map((i) => ({ json: { id: i.json.id.trim() } }));",
				),
			],
			connections: chain(['Hook', 'Set', 'Filter']),
		};
		const { items } = await traced(wf, { list: [] });
		expect(items('Set')).toEqual([{ id: 'undefined' }]);
		expect(items('Filter')).toEqual([]);
	});

	// v1's engine (`WorkflowExecute`): the node runs again after an error, and after a result
	// whose first item has an `error`, with a wait before each next try.
	describe('retry on fail', () => {
		const retry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 250 };
		const run = async (jsCode: string, settings: Record<string, unknown>) => {
			const wf = {
				name: 'Retry',
				nodes: [hook, code('Flaky', jsCode, settings)],
				connections:
					settings.onError === 'continueErrorOutput'
						? { Hook: { main: [[{ node: 'Flaky', type: 'main', index: 0 }]] } }
						: chain(['Hook', 'Flaky']),
			};
			const out = convertWorkflow(wf, { trace: 'all' });
			expect(out.ok).toBe(true);
			expect(out.fallbackNodes).toEqual([]);
			const ran = await runReference(out.source, {
				trigger: { body: { id: 7 } },
				now: 0,
				seed: 1,
				effects: {},
				trace: true,
			});
			const waits = ran.effects.filter((e) => e.kind === 'wait' && e.step === 'Flaky (retry)');
			const items = (ran.trace ?? []).filter((t) => t.step === 'Flaky').pop()?.items;
			return { ran, waits: waits.length, items };
		};

		it('runs the code once when it gives a result', async () => {
			const r = await run('return [{ json: { ok: true } }];', retry);
			expect(r.waits).toBe(0);
			expect(r.items).toEqual([{ ok: true }]);
		});

		it('runs failing code up to the number of tries, then fails the node', async () => {
			const r = await run("throw new Error('down');", retry);
			expect(r.waits).toBe(2);
			expect(r.ran.status).toBe('error');
			expect(JSON.stringify(r.ran.result)).toContain('down [line 1]');
		});

		it('uses the limits of v1 for the tries and the wait', async () => {
			const r = await run("throw new Error('down');", {
				retryOnFail: true,
				maxTries: 9,
				waitBetweenTries: 60_000,
			});
			expect(r.waits).toBe(4);
			const wait = r.ran.effects.find((e) => e.kind === 'wait');
			expect(wait?.args).toEqual({ name: 'Flaky (retry)', duration: 5000 });
		});

		it('tries again when the first item of the result has an error', async () => {
			const r = await run("return [{ json: { error: 'soft' } }, { json: { n: 2 } }];", retry);
			expect(r.waits).toBe(2);
			expect(r.items).toEqual([{ error: 'soft' }, { n: 2 }]);
		});

		it('gives the error item after the last try under "continue"', async () => {
			const r = await run("throw new Error('down');", {
				...retry,
				onError: 'continueRegularOutput',
			});
			expect(r.waits).toBe(2);
			expect(r.items).toEqual([{ error: 'down [line 1]' }]);
		});

		it('gives the error output its item after the last try', async () => {
			const r = await run("throw new Error('down');", {
				...retry,
				onError: 'continueErrorOutput',
			});
			expect(r.waits).toBe(2);
			expect(r.ran.status).toBe('ok');
		});

		it('fails the node for a result that is not valid, after the tries', async () => {
			const r = await run('return 5;', { ...retry, onError: 'continueRegularOutput' });
			expect(r.waits).toBe(2);
			expect(r.ran.status).toBe('error');
			expect(JSON.stringify(r.ran.result)).toContain("Code doesn't return items properly");
		});
	});

	describe('modules of require', () => {
		const wf = {
			name: 'Hash',
			nodes: [
				hook,
				code(
					'Hash',
					"const crypto = require('crypto'); return [{ json: { a: crypto.createHash('md5').update('a').digest('hex') } }];",
				),
			],
			connections: chain(['Hook', 'Hash']),
		};

		it.each([
			['no option', undefined, ['Hash']],
			['a list without the module', ['os'], ['Hash']],
			['a list with the module', ['crypto'], []],
			['every module', ['*'], []],
		])(
			'runs the code natively only when the list allows the module: %s',
			(_, codeModules, host) => {
				const out = convertWorkflow(wf, codeModules === undefined ? {} : { codeModules });
				expect(out.ok).toBe(true);
				expect(out.fallbackNodes).toEqual(host);
			},
		);
	});
});
