import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';

import z from 'zod';
import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { searchWorkflows, createSearchWorkflowsTool } from '../tools/search-workflows.tool';

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
				getMany: vi.fn().mockResolvedValue({ workflows, count: 1 }),
			});

			const telemetry = mockInstance(Telemetry, {
				track: vi.fn(),
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
						activeVersionId: 'version-a',
						name: 'Alpha',
						nodes: [{ name: 'Start', type: MANUAL_TRIGGER_NODE_TYPE } as INode],
						settings: { availableInMCP: true },
						activeVersion: createWorkflowHistoryVersion({
							workflowId: 'a',
							versionId: 'version-a',
							authors: JSON.stringify([{ id: user.id, firstName: 'Test', lastName: 'User' }]),
							nodes: [{ name: 'Schedule Trigger', type: SCHEDULE_TRIGGER_NODE_TYPE } as INode],
						}),
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
						settings: { availableInMCP: true },
						activeVersion: createWorkflowHistoryVersion({
							workflowId: 'b',
							versionId: 'version-b',
							authors: JSON.stringify([{ id: user.id, firstName: 'Test', lastName: 'User' }]),
							nodes: [{ name: 'Schedule Trigger', type: SCHEDULE_TRIGGER_NODE_TYPE } as INode],
						}),
					}),
					scopes: ['workflow:read'],
				},
			];

			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 2 }),
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
					scopes: ['workflow:read', 'workflow:execute'],
					canExecute: true,
					availableInMCP: true,
					tags: [],
				},
				{
					id: 'b',
					name: 'Beta',
					description: null,
					active: true,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
					triggerCount: 1,
					scopes: ['workflow:read'],
					canExecute: false,
					availableInMCP: true,
					tags: [],
				},
			]);
		});

		test('forwards tags filter and surfaces workflow tags in output', async () => {
			const tags = [
				{ id: 'tag-1', name: 'production' },
				{ id: 'tag-2', name: 'critical' },
			] as unknown as WorkflowEntity['tags'];
			const workflows = [
				createWorkflow({
					id: 'tagged',
					activeVersionId: uuid(),
					tags,
				}),
			];
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 1 }),
			});

			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				tags: ['production', 'critical'],
			});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter).toMatchObject({ tags: ['production', 'critical'] });
			expect(optionsArg.select).toMatchObject({ tags: true });
			expect(result.data[0].tags).toEqual([
				{ id: 'tag-1', name: 'production' },
				{ id: 'tag-2', name: 'critical' },
			]);
		});

		test('drops empty tag entries and omits filter when no tags remain', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});

			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				tags: ['', ''],
			});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.tags).toBeUndefined();
		});

		test('deduplicates repeated tag names before forwarding the filter', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});

			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				tags: ['production', 'production', 'critical', 'production'],
			});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.tags).toEqual(['production', 'critical']);
		});

		test('applies provided filters and clamps high limit', async () => {
			const workflows = [createWorkflow({ id: 'x', activeVersionId: uuid() })];
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 500,
				query: 'foo',
				projectId: 'proj-1',
			});

			const [_userArg, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.take).toBe(200);
			expect(optionsArg.filter).toMatchObject({
				isArchived: false,
				query: 'foo',
				projectId: 'proj-1',
			});
		});

		test('defaults to sorting by most recently updated first', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.sortBy).toBe('updatedAt:desc');
		});

		test('passes through explicit sortBy option', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				sortBy: 'name:asc',
			});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.sortBy).toBe('name:asc');
		});

		test('clamps non-positive limit up to 1', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(user, workflowService as unknown as WorkflowService, {
				limit: 0,
			});
			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.take).toBe(1);
		});

		test('formats workflows with basic metadata', async () => {
			const workflows = [
				createWorkflow({
					id: 'no-nodes',
					activeVersionId: 'version-no-nodes',
					nodes: [],
					settings: { availableInMCP: true },
				}),
			];
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {});
			expect(result.data[0]).toMatchObject({
				id: 'no-nodes',
				scopes: [],
				canExecute: false,
				availableInMCP: true,
			});
		});
	});

	describe('output schema', () => {
		// Regression: the advertised output schema for each workflow item must allow
		// extra properties. The data layer (workflowService.getMany) can surface fields
		// beyond the declared set; without passthrough the client rejects the whole
		// response with `-32602 ... must NOT have additional properties`.
		// All other MCP schemas (nodeSchema, tagSchema, workflowDetails) are passthrough.
		test('tolerates unknown properties on workflow items (passthrough)', () => {
			const workflowService = mockInstance(WorkflowService, { getMany: vi.fn() });
			const telemetry = mockInstance(Telemetry, { track: vi.fn() });
			const tool = createSearchWorkflowsTool(
				user,
				workflowService as unknown as WorkflowService,
				telemetry,
			);

			expect(tool.config.outputSchema).toBeDefined();
			const schema = z.object(tool.config.outputSchema as z.ZodRawShape);
			const item = {
				id: 'a',
				name: 'Alpha',
				description: null,
				active: true,
				createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
				updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
				triggerCount: 0,
				scopes: [],
				canExecute: false,
				availableInMCP: true,
				tags: [],
				resource: 'workflow', // unknown field surfaced by the data layer
			};

			const parsed = schema.parse({ data: [item], count: 1 });

			expect(parsed.data[0]).toHaveProperty('resource', 'workflow');
		});
	});
});
