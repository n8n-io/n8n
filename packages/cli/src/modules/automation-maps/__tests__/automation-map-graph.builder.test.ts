import type { INode } from 'n8n-workflow';

import {
	buildAutomationMapGraph,
	type GraphBuilderContext,
	type WorkflowSource,
} from '../automation-map-graph.builder';

const TICK_ID = 'tickWorkflow0001';
const UNIT_ID = 'unitWorkflow0001';
const CLAIM_ID = 'claimWorkflow001';
const OTHER_ID = 'otherWorkflow001';

function node(name: string, type: string, parameters: INode['parameters'] = {}): INode {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters };
}

function workflow(id: string, name: string, nodes: INode[]): WorkflowSource {
	return {
		id,
		name,
		description: null,
		active: true,
		isArchived: false,
		nodes,
		settings: null,
		versionId: `${id}-v1`,
		updatedAt: new Date('2026-10-01T00:00:00Z'),
		parentFolderId: null,
		projectId: null,
		tags: [],
	};
}

function context(): GraphBuilderContext {
	return {
		workflows: [
			workflow(TICK_ID, 'Conveyor: Tick', [
				node('Every minute', 'n8n-nodes-base.scheduleTrigger', {
					rule: { interval: [{ field: 'minutes', minutesInterval: 1 }] },
				}),
				node('Find routes', 'n8n-nodes-base.dataTable', {
					operation: 'get',
					dataTableId: { __rl: true, mode: 'id', value: 'dispatchTable' },
				}),
				node('Dispatch', 'n8n-nodes-base.executeWorkflow', {
					workflowId: { __rl: true, mode: 'id', value: '={{ $json.workflow_id }}' },
				}),
			]),
			workflow(UNIT_ID, 'Conveyor: Unit', [
				node('Input', 'n8n-nodes-base.executeWorkflowTrigger'),
				node('Claim', 'n8n-nodes-base.executeWorkflow', {
					workflowId: { __rl: true, mode: 'id', value: CLAIM_ID },
				}),
				node('Comment', 'n8n-nodes-base.linear', {}),
			]),
			workflow(CLAIM_ID, 'Claim', [node('Input', 'n8n-nodes-base.executeWorkflowTrigger')]),
			workflow(OTHER_ID, 'Unrelated', [node('Run', 'n8n-nodes-base.manualTrigger')]),
		],
		folders: [],
		dataTables: [{ id: 'dispatchTable', name: 'conveyor_dispatch', projectId: 'project1' }],
		describeNodeType: (nodeType) => (nodeType === 'n8n-nodes-base.linear' ? 'Linear' : undefined),
		findWorkflowIdsInTable: async (tableId) => (tableId === 'dispatchTable' ? [UNIT_ID] : []),
	};
}

describe('buildAutomationMapGraph', () => {
	it('follows dispatch tables, sub-workflow calls and services from the scoped workflows', async () => {
		const graph = await buildAutomationMapGraph(
			{ keywords: ['conveyor'], folderIds: [], tags: [], workflowIds: [] },
			context(),
		);

		expect(graph.workflows.map((item) => item.id).sort()).toEqual(
			[CLAIM_ID, TICK_ID, UNIT_ID].sort(),
		);
		expect(graph.edges).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'dispatches',
					source: `wf:${TICK_ID}`,
					target: `wf:${UNIT_ID}`,
					via: 'conveyor_dispatch',
				}),
				expect.objectContaining({
					kind: 'calls',
					source: `wf:${UNIT_ID}`,
					target: `wf:${CLAIM_ID}`,
				}),
				expect.objectContaining({
					kind: 'reads',
					source: 'dt:dispatchTable',
					target: `wf:${TICK_ID}`,
				}),
				expect.objectContaining({
					kind: 'uses',
					source: `wf:${UNIT_ID}`,
					target: 'svc:n8n-nodes-base.linear',
				}),
			]),
		);
		expect(graph.services).toEqual([expect.objectContaining({ name: 'Linear' })]);
		expect(graph.workflows.find((item) => item.id === TICK_ID)?.triggers).toEqual([
			expect.objectContaining({ kind: 'schedule', label: 'Every minute' }),
		]);
	});

	it('flags a dynamic call that no data table resolves', async () => {
		const base = context();
		const graph = await buildAutomationMapGraph(
			{ keywords: [], folderIds: [], tags: [], workflowIds: [TICK_ID] },
			{ ...base, findWorkflowIdsInTable: async () => [] },
		);

		expect(graph.workflows.find((item) => item.id === TICK_ID)?.hasUnresolvedDynamicCall).toBe(
			true,
		);
	});
});
