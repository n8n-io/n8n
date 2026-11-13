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
		expect(items('Log')).toEqual([{ error: 'missing id' }]);
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
});
