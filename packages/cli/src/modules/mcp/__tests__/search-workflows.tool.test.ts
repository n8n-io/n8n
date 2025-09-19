import { mockInstance } from '@n8n/backend-test-utils';
import { User, type WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { searchWorkflows, createSearchWorkflowsTool } from '../tools/search-workflows.tool';

import { WorkflowService } from '@/workflows/workflow.service';

describe('search-workflows MCP tool', () => {
	const makeMockWorkflow = (overrides: Partial<WorkflowEntity> = {}) => ({
		id: overrides.id ?? 'wf-1',
		name: overrides.name ?? 'My workflow',
		active: overrides.active ?? false,
		createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00.000Z'),
		triggerCount: overrides.triggerCount ?? 1,
		nodes: overrides.nodes ?? [],
	});

	const user = Object.assign(new User(), { id: 'user-1' });

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const workflows = [
				makeMockWorkflow({
					id: 'wrap-1',
					name: 'Wrapper',
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.start' } as INode],
				}),
			];

			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});

			const tool = createSearchWorkflowsTool(user, workflowService as unknown as WorkflowService);

			expect(tool.name).toBe('search_workflows');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('formats the output correctly', async () => {
			const workflows = [
				makeMockWorkflow({
					id: 'a',
					name: 'Alpha',
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.start' } as INode],
				}),
				makeMockWorkflow({
					id: 'b',
					name: 'Beta',
					nodes: [{ name: 'Cron', type: 'n8n-nodes-base.cron' } as INode],
				}),
			];

			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 2 }),
			});
			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {});

			expect(result.count).toBe(2);
			expect(result.data).toEqual([
				{
					id: 'a',
					name: 'Alpha',
					active: false,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
					triggerCount: 1,
					nodes: [{ name: 'Start', type: 'n8n-nodes-base.start' }],
				},
				{
					id: 'b',
					name: 'Beta',
					active: false,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
					triggerCount: 1,
					nodes: [{ name: 'Cron', type: 'n8n-nodes-base.cron' }],
				},
			]);
		});

		test('applies provided filters and clamps high limit', async () => {
			const workflows = [makeMockWorkflow({ id: 'x', active: true })];
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 500,
				active: true,
				name: 'foo',
				projectId: 'proj-1',
			});

			const [_userArg, optionsArg] = (workflowService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.take).toBe(200); // clamped to MAX_RESULTS
			expect(optionsArg.filter).toMatchObject({
				isArchived: false,
				availableInMCP: true,
				active: true,
				name: 'foo',
				projectId: 'proj-1',
			});
		});

		test('clamps non-positive limit up to 1', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 0 as any,
			});
			const [, optionsArg] = (workflowService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.take).toBe(1);
		});

		test('formats nodes as empty array when missing', async () => {
			const workflows = [makeMockWorkflow({ id: 'no-nodes', nodes: undefined })];
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {});
			expect(result.data[0]).toMatchObject({ id: 'no-nodes', nodes: [] });
		});
	});
});
