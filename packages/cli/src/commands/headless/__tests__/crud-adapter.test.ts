import { mockInstance } from '@n8n/backend-test-utils';
import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { crudAdapter } from '../crud-adapter';
import type { ParsedWorkflow } from '../parse';

import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { WorkflowService } from '@/workflows/workflow.service';

jest.mock('@/public-api/v1/handlers/workflows/workflows.service', () => ({
	createWorkflow: jest.fn(),
}));

const workflowService = mockInstance(WorkflowService);
const owner = mock<User>({ id: 'owner-123' });

const minimalParsed = (name: string): ParsedWorkflow => ({
	name,
	nodes: [
		{
			id: 'node-1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('crudAdapter.createWorkflows', () => {
	it('persists each ParsedWorkflow via the public-API createWorkflow and returns the imported set', async () => {
		const parsed = minimalParsed('Test Workflow');
		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' }));

		const result = await crudAdapter.createWorkflows(owner, [parsed]);

		expect(result).toEqual([{ id: 'wf-1', name: 'Test Workflow', parsed }]);
		expect(publicApiCreateWorkflow).toHaveBeenCalledTimes(1);
		expect(publicApiCreateWorkflow).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({
				name: 'Test Workflow',
				nodes: parsed.nodes,
				connections: parsed.connections,
			}),
		);
	});

	it('handles multiple workflows in input order', async () => {
		const a = minimalParsed('A');
		const b = minimalParsed('B');

		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-a', name: 'A' }))
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-b', name: 'B' }));

		const result = await crudAdapter.createWorkflows(owner, [a, b]);

		expect(result.map((r) => r.id)).toEqual(['wf-a', 'wf-b']);
		expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
			1,
			owner,
			expect.objectContaining({ name: 'A' }),
		);
		expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
			2,
			owner,
			expect.objectContaining({ name: 'B' }),
		);
	});

	it('coerces a missing settings field to an empty object before passing to createWorkflow', async () => {
		const parsed = minimalParsed('No Settings');
		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'No Settings' }));

		await crudAdapter.createWorkflows(owner, [parsed]);

		expect(publicApiCreateWorkflow).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({ settings: {} }),
		);
	});
});

describe('crudAdapter.activateWorkflow', () => {
	it('delegates to WorkflowService.activateWorkflow with source="api"', async () => {
		workflowService.activateWorkflow.mockResolvedValue(
			mock<WorkflowEntity>({ id: 'wf-1', active: true }),
		);

		await crudAdapter.activateWorkflow(owner, 'wf-1');

		expect(workflowService.activateWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowService.activateWorkflow).toHaveBeenCalledWith(owner, 'wf-1', { source: 'api' });
	});
});
