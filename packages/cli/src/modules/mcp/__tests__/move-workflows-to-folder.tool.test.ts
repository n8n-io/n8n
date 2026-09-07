import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderFinderService } from '@/services/folder-finder.service';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createMoveWorkflowsToFolderTool } from '../tools/move-workflows-to-folder.tool';

const workflowFixture = (id: string, name: string, overrides: Record<string, unknown> = {}) => ({
	id,
	name,
	isArchived: false,
	settings: { availableInMCP: true },
	...overrides,
});

describe('move-workflows-to-folder MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		workflows?: Record<string, ReturnType<typeof workflowFixture> | null>;
		folder?: { id: string; name: string } | null;
	}) => {
		const workflows = overrides?.workflows ?? {
			'wf-1': workflowFixture('wf-1', 'My workflow'),
		};
		const folder =
			overrides?.folder === undefined ? { id: 'folder-1', name: 'Marketing' } : overrides.folder;

		const workflowFinderService = mockInstance(WorkflowFinderService, {
			findWorkflowsByIdsForUser: vi
				.fn()
				.mockImplementation(async (workflowIds: string[]) =>
					workflowIds.map((workflowId) => workflows[workflowId]).filter(Boolean),
				),
		});

		const workflowService = mockInstance(WorkflowService, {
			update: vi.fn().mockResolvedValue({}),
		});

		const folderFinderService = mockInstance(FolderFinderService, {
			findFoldersByIdsForUser: vi.fn().mockResolvedValue(folder ? [folder] : []),
		});

		const telemetry = mockInstance(Telemetry, { track: vi.fn() });

		return { workflowFinderService, workflowService, folderFinderService, telemetry };
	};

	const createTool = (mocks: ReturnType<typeof createMocks>) =>
		createMoveWorkflowsToFolderTool(
			user,
			mocks.workflowFinderService,
			mocks.workflowService,
			mocks.folderFinderService,
			mocks.telemetry,
		);

	test('creates tool correctly', () => {
		const tool = createTool(createMocks());

		expect(tool.name).toBe('move_workflows_to_folder');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('moves a workflow into a folder', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await tool.handler({ workflowIds: ['wf-1'], folderId: 'folder-1' });

		expect(mocks.folderFinderService.findFoldersByIdsForUser).toHaveBeenCalledWith(
			['folder-1'],
			user,
			['folder:read'],
		);
		expect(mocks.workflowFinderService.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			['wf-1'],
			user,
			['workflow:update'],
		);
		expect(mocks.workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-1', {
			parentFolderId: 'folder-1',
			source: 'n8n-mcp',
		});
		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			folder: { id: 'folder-1', name: 'Marketing' },
			moved: [{ workflowId: 'wf-1', name: 'My workflow' }],
		});
	});

	test('moves multiple workflows and reports partial failures', async () => {
		const mocks = createMocks({
			workflows: {
				'wf-1': workflowFixture('wf-1', 'First'),
				'wf-2': null,
				'wf-3': workflowFixture('wf-3', 'Third'),
			},
		});
		const tool = createTool(mocks);

		const result = await tool.handler({
			workflowIds: ['wf-1', 'wf-2', 'wf-3'],
			folderId: 'folder-1',
		});

		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			folder: { id: 'folder-1', name: 'Marketing' },
			moved: [
				{ workflowId: 'wf-1', name: 'First' },
				{ workflowId: 'wf-3', name: 'Third' },
			],
			failed: [
				{
					workflowId: 'wf-2',
					error: "Workflow not found or you don't have permission to access it.",
				},
			],
		});
	});

	test('moves workflows to the project root without a folder lookup', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await tool.handler({ workflowIds: ['wf-1'], folderId: PROJECT_ROOT });

		expect(mocks.folderFinderService.findFoldersByIdsForUser).not.toHaveBeenCalled();
		expect(mocks.workflowService.update).toHaveBeenCalledWith(user, expect.anything(), 'wf-1', {
			parentFolderId: PROJECT_ROOT,
			source: 'n8n-mcp',
		});
		expect(result.structuredContent).toEqual({
			moved: [{ workflowId: 'wf-1', name: 'My workflow' }],
		});
	});

	test('returns error when the destination folder does not exist', async () => {
		const mocks = createMocks({ folder: null });
		const tool = createTool(mocks);

		const result = await tool.handler({ workflowIds: ['wf-1'], folderId: 'missing' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: 'Could not find the folder: missing. Use search_folders to look up a valid folder id.',
		});
		expect(mocks.workflowService.update).not.toHaveBeenCalled();
	});

	test('returns error when no workflow could be moved', async () => {
		const mocks = createMocks({ workflows: { 'wf-1': null } });
		const tool = createTool(mocks);

		const result = await tool.handler({ workflowIds: ['wf-1'], folderId: 'folder-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			folder: { id: 'folder-1', name: 'Marketing' },
			failed: [
				{
					workflowId: 'wf-1',
					error: "Workflow not found or you don't have permission to access it.",
				},
			],
			error: 'None of the workflows could be moved',
		});
	});

	test('rejects workflows that are not available in MCP', async () => {
		const mocks = createMocks({
			workflows: {
				'wf-1': workflowFixture('wf-1', 'Hidden', { settings: { availableInMCP: false } }),
			},
		});
		const tool = createTool(mocks);

		const result = await tool.handler({ workflowIds: ['wf-1'], folderId: 'folder-1' });

		expect(result.isError).toBe(true);
		expect(mocks.workflowService.update).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({
			failed: [expect.objectContaining({ workflowId: 'wf-1' })],
		});
	});
});
