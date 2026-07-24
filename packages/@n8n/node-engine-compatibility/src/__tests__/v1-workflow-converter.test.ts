import type { INode, IWorkflowBase } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { V1WorkflowConverter } from '../v1-workflow-converter';

const converter = new V1WorkflowConverter();

const manualTrigger: INode = {
	id: 'trigger-uuid',
	name: 'When clicking Execute',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** Build a minimal IWorkflowBase for conversion tests. */
function workflow(overrides: Partial<IWorkflowBase>): IWorkflowBase {
	return {
		id: 'wf-1',
		name: 'Test workflow',
		active: false,
		isArchived: false,
		nodes: [],
		connections: {},
		settings: {},
		...overrides,
	} as IWorkflowBase;
}

describe('V1WorkflowConverter', () => {
	describe('trigger nodes', () => {
		it('maps a manual trigger to a single trigger graph node', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						{
							id: 'node-uuid-1',
							name: 'When clicking Execute',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
			);

			expect(graph.nodes).toEqual([
				{ id: 'node-uuid-1', name: 'When clicking Execute', type: 'trigger' },
			]);
			expect(graph.edges).toEqual([]);
		});
	});

	describe('v1 nodes', () => {
		it('maps a regular node to a v1-node step carrying its config', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						{
							id: 'set-uuid',
							name: 'Edit Fields',
							type: 'n8n-nodes-base.set',
							typeVersion: 3.4,
							position: [200, 0],
							parameters: { mode: 'manual', includeOtherFields: true },
							continueOnFail: true,
						},
					],
				}),
			);

			expect(graph.nodes).toContainEqual({
				id: 'set-uuid',
				name: 'Edit Fields',
				type: 'v1-node',
				config: {
					nodeType: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					parameters: { mode: 'manual', includeOtherFields: true },
					continueOnFail: true,
				},
			});
		});

		it('defaults continueOnFail to false when the node omits it', () => {
			const graph = converter.convert(
				workflow({
					nodes: [
						manualTrigger,
						{
							id: 'noop-uuid',
							name: 'No Operation',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
					],
				}),
			);

			const noOp = graph.nodes.find((n) => n.id === 'noop-uuid');
			expect(noOp?.config).toMatchObject({ continueOnFail: false });
		});
	});

	describe('unsupported constructs', () => {
		it('rejects a non-manual trigger with a clear error', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							{
								id: 'webhook-uuid',
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 2,
								position: [0, 0],
								parameters: {},
							},
						],
					}),
				),
			).toThrowError(/Webhook.*not supported/i);
		});

		it('rejects a schedule trigger (type ending in "Trigger")', () => {
			expect(() =>
				converter.convert(
					workflow({
						nodes: [
							{
								id: 'sched-uuid',
								name: 'Schedule Trigger',
								type: 'n8n-nodes-base.scheduleTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
						],
					}),
				),
			).toThrowError(/not supported/i);
		});
	});
});
