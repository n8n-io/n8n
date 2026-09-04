import type { Mock } from 'vitest';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { Folder, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	PROJECT_ROOT,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { FolderFinderService } from '@/services/folder-finder.service';
import { Telemetry } from '@/telemetry';
import { WorkflowService } from '@/workflows/workflow.service';

import z from 'zod';
import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { searchWorkflows, createSearchWorkflowsTool } from '../tools/search-workflows.tool';

describe('search-workflows MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const folderFixture = (id: string) => ({ id, name: `folder-${id}` }) as Folder;

	/**
	 * Resolves the given folder ids for a filter lookup; an empty list stands in
	 * for a folderId that matches no folder.
	 */
	const mockFolderFinder = (folderIds: string[] = []) =>
		mockInstance(FolderFinderService, {
			findFolderFilterIdsWithoutAccessCheck: vi.fn().mockResolvedValue(folderIds),
		});

	const folderFinderService = mockFolderFinder();

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
				folderFinderService,
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
				},
			];

			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 2 }),
			});
			const result = await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{},
			);

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
					availableInMCP: true,
					parentFolderId: null,
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
					availableInMCP: true,
					parentFolderId: null,
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

			const result = await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					tags: ['production', 'critical'],
				},
			);

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

			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					tags: ['', ''],
				},
			);

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.tags).toBeUndefined();
		});

		test('deduplicates repeated tag names before forwarding the filter', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});

			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					tags: ['production', 'production', 'critical', 'production'],
				},
			);

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.tags).toEqual(['production', 'critical']);
		});

		test('applies provided filters and clamps high limit', async () => {
			const workflows = [createWorkflow({ id: 'x', activeVersionId: uuid() })];
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 1 }),
			});
			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					limit: 500,
					query: 'foo',
					projectId: 'proj-1',
				},
			);

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
			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{},
			);

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.sortBy).toBe('updatedAt:desc');
		});

		test('passes through explicit sortBy option', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					sortBy: 'name:asc',
				},
			);

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.sortBy).toBe('name:asc');
		});

		test('clamps non-positive limit up to 1', async () => {
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});
			await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{
					limit: 0,
				},
			);
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
			const result = await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{},
			);
			expect(result.data[0]).toMatchObject({
				id: 'no-nodes',
				availableInMCP: true,
			});
		});

		// Regression test for https://github.com/n8n-io/n8n/issues/31677
		// SQLite returns datetime columns as strings, not Date objects.
		// Calling .toISOString() on a string throws — new Date(value) is idempotent.
		test('handles SQLite string datetime values without throwing', async () => {
			const workflows = [
				{
					...createWorkflow({ id: 'sqlite-wf', activeVersionId: 'v1' }),
					// Simulate SQLite projected-select returning strings instead of Date objects
					createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
					updatedAt: '2024-01-02T00:00:00.000Z' as unknown as Date,
				},
			];
			const workflowService = mockInstance(WorkflowService, {
				getMany: jest.fn().mockResolvedValue({ workflows, count: 1 }),
			});

			const result = await searchWorkflows(user, workflowService as unknown as WorkflowService, {});

			expect(result.data[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
			expect(result.data[0].updatedAt).toBe('2024-01-02T00:00:00.000Z');
		});
	});

	describe('folder filtering', () => {
		const emptyResult = () =>
			mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows: [], count: 0 }),
			});

		test('searches the folder and its subfolders by default', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder(['folder-1', 'folder-1-child']);

			await searchWorkflows(user, workflowService as unknown as WorkflowService, folderFinder, {
				folderId: 'folder-1',
			});

			expect(folderFinder.findFolderFilterIdsWithoutAccessCheck).toHaveBeenCalledWith(
				'folder-1',
				true,
			);
			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.parentFolderIds).toEqual(['folder-1', 'folder-1-child']);
			expect(optionsArg.filter.parentFolderId).toBeUndefined();
		});

		test('searches only the folder itself when includeSubfolders is false', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder(['folder-1']);

			await searchWorkflows(user, workflowService as unknown as WorkflowService, folderFinder, {
				folderId: 'folder-1',
				includeSubfolders: false,
			});

			expect(folderFinder.findFolderFilterIdsWithoutAccessCheck).toHaveBeenCalledWith(
				'folder-1',
				false,
			);
			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.parentFolderIds).toEqual(['folder-1']);
			expect(optionsArg.filter.parentFolderId).toBeUndefined();
		});

		test('matches the project root without resolving a folder', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder();

			await searchWorkflows(user, workflowService as unknown as WorkflowService, folderFinder, {
				folderId: PROJECT_ROOT,
			});

			expect(folderFinder.findFolderFilterIdsWithoutAccessCheck).not.toHaveBeenCalled();
			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter.parentFolderId).toBe(PROJECT_ROOT);
		});

		test('combines the folder filter with the other filters', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder(['folder-1']);

			await searchWorkflows(user, workflowService as unknown as WorkflowService, folderFinder, {
				folderId: 'folder-1',
				projectId: 'proj-1',
				query: 'slack',
			});

			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.filter).toMatchObject({
				isArchived: false,
				query: 'slack',
				projectId: 'proj-1',
				parentFolderIds: ['folder-1'],
			});
		});

		test('reports the folder holding each workflow so it can be searched next', async () => {
			const workflows = [
				createWorkflow({
					id: 'in-folder',
					activeVersionId: uuid(),
					parentFolder: folderFixture('folder-1'),
				}),
				createWorkflow({ id: 'at-root', activeVersionId: uuid() }),
			];
			const workflowService = mockInstance(WorkflowService, {
				getMany: vi.fn().mockResolvedValue({ workflows, count: 2 }),
			});

			const result = await searchWorkflows(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				{},
			);

			expect(result.data[0].parentFolderId).toBe('folder-1');
			// null rather than absent, matching what get_workflow_details reports.
			expect(result.data[1].parentFolderId).toBeNull();
			const [, optionsArg] = (workflowService.getMany as Mock).mock.calls[0];
			expect(optionsArg.select).toMatchObject({ parentFolder: true });
		});

		test('treats an empty folderId as a folder that cannot be resolved', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder([]);

			await expect(
				searchWorkflows(user, workflowService as unknown as WorkflowService, folderFinder, {
					folderId: '',
				}),
			).rejects.toThrow(FolderNotFoundError);
			expect(workflowService.getMany).not.toHaveBeenCalled();
		});

		// An id matching no folder must fail loudly: dropping the filter would
		// quietly hand back every workflow on the instance instead.
		test('fails with a recoverable error instead of widening the search', async () => {
			const workflowService = emptyResult();
			const folderFinder = mockFolderFinder([]);
			const telemetry = mockInstance(Telemetry, { track: vi.fn() });
			const tool = createSearchWorkflowsTool(
				user,
				workflowService as unknown as WorkflowService,
				folderFinder,
				telemetry,
			);

			const result = await tool.handler({ folderId: 'nope' });

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				data: [],
				count: 0,
				error: expect.stringContaining('search_folders'),
			});
			expect(workflowService.getMany).not.toHaveBeenCalled();
		});
	});

	describe('input schema', () => {
		const folderIdSchemaOf = () => {
			const workflowService = mockInstance(WorkflowService, { getMany: vi.fn() });
			const telemetry = mockInstance(Telemetry, { track: vi.fn() });
			const tool = createSearchWorkflowsTool(
				user,
				workflowService as unknown as WorkflowService,
				folderFinderService,
				telemetry,
			);
			return z.object(tool.config.inputSchema as z.ZodRawShape).shape.folderId;
		};

		// Rejecting these at the schema saves a database lookup for a value that
		// could never be an id — an LLM sending a folder name, most likely.
		test.each([
			['an empty string', ''],
			['a blank string', ' '],
			['a folder name', 'My folder'],
			['a folder path', 'Triggers/Nested'],
		])('rejects %s', (_label, value) => {
			expect(folderIdSchemaOf().safeParse(value).success).toBe(false);
		});

		test.each([
			['a folder id', 'uCTsB9uJaYgN4RYF'],
			['an id minted elsewhere', '0195b8d6-7c3f-7a1e-9f2b-3d4e5f6a7b8c'],
			['the project root sentinel', PROJECT_ROOT],
			['nothing at all', undefined],
		])('accepts %s', (_label, value) => {
			expect(folderIdSchemaOf().safeParse(value).success).toBe(true);
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
				folderFinderService,
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
				availableInMCP: true,
				parentFolderId: null,
				tags: [],
				resource: 'workflow', // unknown field surfaced by the data layer
			};

			const parsed = schema.parse({ data: [item], count: 1 });

			expect(parsed.data[0]).toHaveProperty('resource', 'workflow');
		});
	});
});
