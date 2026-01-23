import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { createWorkflow } from './mock.utils';
import { searchWorkflows, createSearchWorkflowsTool } from '../tools/search-workflows.tool';

import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { v4 as uuid } from 'uuid';

describe('search-workflows MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	describe('smoke tests', () => {
		test('it creates tool correctly', () => {
			const workflows = [
				createWorkflow({
					id: 'wrap-1',
					activeVersionId: uuid(),
					name: 'Wrapper',
					nodes: [{ name: 'Start', type: MANUAL_TRIGGER_NODE_TYPE } as INode],
				}),
			];

			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});

			const telemetry = mockInstance(Telemetry, {
				track: jest.fn(),
			});

			const tool = createSearchWorkflowsTool(
				user,
				workflowService as unknown as WorkflowService,
				telemetry,
			);

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
				{
					...createWorkflow({
						id: 'a',
						activeVersionId: uuid(),
						name: 'Alpha',
						nodes: [{ name: 'Start', type: MANUAL_TRIGGER_NODE_TYPE } as INode],
					}),
					scopes: ['workflow:read', 'workflow:execute'],
				},
				{
					...createWorkflow({
						id: 'b',
						name: 'Beta',
						activeVersionId: 'version-b',
						nodes: [
							{ name: 'Execute subworkflow', type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } as INode,
						],
					}),
					scopes: ['workflow:read'],
				},
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
					description: null,
					active: true,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
					triggerCount: 1,
					nodes: [{ name: 'Start', type: MANUAL_TRIGGER_NODE_TYPE }],
					scopes: ['workflow:read', 'workflow:execute'],
					canExecute: true,
				},
				{
					id: 'b',
					name: 'Beta',
					description: null,
					active: true,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
					triggerCount: 1,
					nodes: [{ name: 'Execute subworkflow', type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE }],
					scopes: ['workflow:read'],
					canExecute: false,
				},
			]);
		});

		test('applies provided filters and clamps high limit', async () => {
			const workflows = [createWorkflow({ id: 'x', activeVersionId: uuid() })];
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 500,
				query: 'foo',
				projectId: 'proj-1',
			});

			const [_userArg, optionsArg] = (workflowService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.take).toBe(200);
			expect(optionsArg.filter).toMatchObject({
				isArchived: false,
				availableInMCP: true,
				query: 'foo',
				projectId: 'proj-1',
			});
		});

		test('clamps non-positive limit up to 1', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 0,
			});
			const [, optionsArg] = (workflowService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.take).toBe(1);
		});

		test('formats nodes as empty array when missing', async () => {
			const workflows = [
				createWorkflow({ id: 'no-nodes', activeVersionId: 'version-no-nodes', nodes: [] }),
			];
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {});
			expect(result.data[0]).toMatchObject({
				id: 'no-nodes',
				nodes: [],
				scopes: [],
				canExecute: false,
			});
		});
	});
});
