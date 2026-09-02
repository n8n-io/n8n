import type { WorkflowEntity } from '@n8n/db';

import { DataTableRequirementsExtractor } from '../data-table-requirements.extractor';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-abc1234567',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v1',
		active: false,
		isArchived: false,
		settings: undefined,
		parentFolder: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeDataTableNode(
	overrides: Partial<{
		id: string;
		type: string;
		dataTableId: { mode: string; value: string };
	}> = {},
): WorkflowEntity['nodes'][number] {
	return {
		id: overrides.id ?? 'n1',
		name: 'Data table',
		type: overrides.type ?? 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			dataTableId: {
				__rl: true,
				...(overrides.dataTableId ?? { mode: 'list', value: 'dt-1' }),
			},
		},
	};
}

describe('DataTableRequirementsExtractor', () => {
	const extractor = new DataTableRequirementsExtractor();

	it('returns no requirements for a workflow with no data-table nodes', () => {
		const workflow = makeWorkflow({
			id: 'wf-no-tables',
			nodes: [
				{
					id: 'n1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('extracts a requirement when mode is "list"', () => {
		const workflow = makeWorkflow({
			id: 'wf-list',
			nodes: [makeDataTableNode({ dataTableId: { mode: 'list', value: 'dt-1' } })],
		});

		expect(extractor.extract(workflow)).toEqual([{ workflowId: 'wf-list', dataTableId: 'dt-1' }]);
	});

	it('extracts a requirement when mode is "id"', () => {
		const workflow = makeWorkflow({
			id: 'wf-id',
			nodes: [makeDataTableNode({ dataTableId: { mode: 'id', value: 'dt-2' } })],
		});

		expect(extractor.extract(workflow)).toEqual([{ workflowId: 'wf-id', dataTableId: 'dt-2' }]);
	});

	it('covers the dataTableTool node type', () => {
		const workflow = makeWorkflow({
			id: 'wf-tool',
			nodes: [
				makeDataTableNode({
					type: 'n8n-nodes-base.dataTableTool',
					dataTableId: { mode: 'id', value: 'dt-3' },
				}),
			],
		});

		expect(extractor.extract(workflow)).toEqual([{ workflowId: 'wf-tool', dataTableId: 'dt-3' }]);
	});

	it('skips mode "name" — cannot be statically resolved to an id', () => {
		const workflow = makeWorkflow({
			id: 'wf-by-name',
			nodes: [makeDataTableNode({ dataTableId: { mode: 'name', value: 'Customers' } })],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('skips expression-based values', () => {
		const workflow = makeWorkflow({
			id: 'wf-expr',
			nodes: [makeDataTableNode({ dataTableId: { mode: 'id', value: '={{ $json.tableId }}' } })],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('skips a slot with no value selected yet', () => {
		const workflow = makeWorkflow({
			id: 'wf-blank-slot',
			nodes: [makeDataTableNode({ dataTableId: { mode: 'list', value: '' } })],
		});

		expect(extractor.extract(workflow)).toEqual([]);
	});

	it('dedupes when the same table id appears in two nodes of one workflow', () => {
		const workflow = makeWorkflow({
			id: 'wf-dup',
			nodes: [
				makeDataTableNode({ id: 'n1', dataTableId: { mode: 'list', value: 'dt-shared' } }),
				makeDataTableNode({ id: 'n2', dataTableId: { mode: 'id', value: 'dt-shared' } }),
			],
		});

		expect(extractor.extract(workflow)).toEqual([
			{ workflowId: 'wf-dup', dataTableId: 'dt-shared' },
		]);
	});

	it('returns an empty list when the workflow has no nodes array at all', () => {
		const workflow = makeWorkflow({ id: 'wf-no-nodes', nodes: undefined as unknown as [] });

		expect(extractor.extract(workflow)).toEqual([]);
	});
});
