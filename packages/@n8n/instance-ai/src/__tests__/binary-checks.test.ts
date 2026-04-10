import { runBinaryChecks } from '../../evaluations/binaryChecks/index';
import type { BinaryCheckContext } from '../../evaluations/binaryChecks/types';
import type { WorkflowResponse } from '../../evaluations/clients/n8n-client';

const ctx: BinaryCheckContext = { prompt: 'Build a workflow' };

function makeWorkflow(overrides: Partial<WorkflowResponse> = {}): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Test Workflow',
		active: false,
		nodes: [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: { assignments: { assignments: [{ name: 'x', value: '1' }] } },
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
		...overrides,
	};
}

describe('binary checks', () => {
	it('passes all checks for a valid workflow', async () => {
		const feedback = await runBinaryChecks(makeWorkflow(), ctx);
		const passRate = feedback.find((f) => f.metric === 'pass_rate');
		expect(passRate?.score).toBe(1);
	});

	it('fails has_nodes for empty workflow', async () => {
		const feedback = await runBinaryChecks(makeWorkflow({ nodes: [] }), ctx);
		const check = feedback.find((f) => f.metric === 'has_nodes');
		expect(check?.score).toBe(0);
	});

	it('fails has_trigger when no trigger node exists', async () => {
		const workflow = makeWorkflow({
			nodes: [{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} }],
			connections: {},
		});
		const feedback = await runBinaryChecks(workflow, ctx);
		const check = feedback.find((f) => f.metric === 'has_trigger');
		expect(check?.score).toBe(0);
	});

	it('fails all_nodes_connected for disconnected node', async () => {
		const workflow = makeWorkflow({
			nodes: [
				{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
				{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {} },
				{ name: 'Orphan', type: 'n8n-nodes-base.code', parameters: {} },
			],
			connections: {
				Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
			},
		});
		const feedback = await runBinaryChecks(workflow, ctx);
		const check = feedback.find((f) => f.metric === 'all_nodes_connected');
		expect(check?.score).toBe(0);
		expect(check?.comment).toContain('Orphan');
	});

	it('fails no_empty_set_nodes when Set has no assignments', async () => {
		const workflow = makeWorkflow({
			nodes: [
				{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
				{ name: 'EmptySet', type: 'n8n-nodes-base.set', parameters: {} },
			],
			connections: {
				Webhook: { main: [[{ node: 'EmptySet', type: 'main', index: 0 }]] },
			},
		});
		const feedback = await runBinaryChecks(workflow, ctx);
		const check = feedback.find((f) => f.metric === 'no_empty_set_nodes');
		expect(check?.score).toBe(0);
		expect(check?.comment).toContain('EmptySet');
	});

	it('fails no_disabled_nodes when a node is disabled', async () => {
		const workflow = makeWorkflow({
			nodes: [
				{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
				{ name: 'Set', type: 'n8n-nodes-base.set', parameters: {}, disabled: true },
			],
			connections: {
				Webhook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
			},
		});
		const feedback = await runBinaryChecks(workflow, ctx);
		const check = feedback.find((f) => f.metric === 'no_disabled_nodes');
		expect(check?.score).toBe(0);
	});

	it('supports --only filter', async () => {
		const feedback = await runBinaryChecks(makeWorkflow(), ctx, { only: ['has_nodes'] });
		const metrics = feedback.filter((f) => f.kind === 'metric');
		expect(metrics).toHaveLength(1);
		expect(metrics[0].metric).toBe('has_nodes');
	});

	it('throws for unknown check name in --only filter', async () => {
		await expect(runBinaryChecks(makeWorkflow(), ctx, { only: ['bogus'] })).rejects.toThrow(
			/Unknown binary check/,
		);
	});
});
