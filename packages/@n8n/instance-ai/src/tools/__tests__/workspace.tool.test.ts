import type { InstanceAiPermissions } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createWorkspaceTool } from '../workspace.tool';

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: vi.fn(),
			get: vi.fn(),
			getAsWorkflowJSON: vi.fn(),
			createFromWorkflowJSON: vi.fn(),
			updateFromWorkflowJSON: vi.fn(),
			archive: vi.fn(),
			delete: vi.fn(),
			publish: vi.fn(),
			unpublish: vi.fn(),
		},
		executionService: {
			list: vi.fn(),
			run: vi.fn(),
			getStatus: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
		},
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {
			listAvailable: vi.fn(),
			getDescription: vi.fn(),
			listSearchable: vi.fn(),
		},
		dataTableService: {
			list: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getSchema: vi.fn(),
			addColumn: vi.fn(),
			deleteColumn: vi.fn(),
			renameColumn: vi.fn(),
			queryRows: vi.fn(),
			insertRows: vi.fn(),
			updateRows: vi.fn(),
			deleteRows: vi.fn(),
		},
		workspaceService: {
			listProjects: vi.fn(),
			listTags: vi.fn(),
			tagWorkflow: vi.fn(),
			createTag: vi.fn(),
			cleanupTestExecutions: vi.fn(),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('workspace tool', () => {
	describe('when workspaceService is missing', () => {
		it('should return an error tool', async () => {
			const context = createMockContext({ workspaceService: undefined });
			const tool = createWorkspaceTool(context);

			const result = await executeTool(tool, { action: 'list-projects' }, {} as never);

			expect(result).toEqual({ error: 'Workspace service is not available in this environment.' });
		});
	});

	describe('list-projects', () => {
		it('should call workspaceService.listProjects and return result', async () => {
			const projects = [{ id: 'p1', name: 'Project 1', type: 'team' as const }];
			const context = createMockContext();
			(context.workspaceService!.listProjects as Mock).mockResolvedValue(projects);

			const tool = createWorkspaceTool(context);
			const result = await executeTool(tool, { action: 'list-projects' }, {} as never);

			expect(context.workspaceService!.listProjects).toHaveBeenCalled();
			expect(result).toEqual({ projects });
		});
	});

	describe('list-tags', () => {
		it('should call workspaceService.listTags and return result', async () => {
			const tags = [{ id: 't1', name: 'production' }];
			const context = createMockContext();
			(context.workspaceService!.listTags as Mock).mockResolvedValue(tags);

			const tool = createWorkspaceTool(context);
			const result = await executeTool(tool, { action: 'list-tags' }, {} as never);

			expect(context.workspaceService!.listTags).toHaveBeenCalled();
			expect(result).toEqual({ tags });
		});
	});

	describe('tag-workflow', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { tagWorkflow: 'blocked' },
			});
			const tool = createWorkspaceTool(context);

			const result = await executeTool(
				tool,
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{} as never,
			);

			expect(result).toEqual({
				appliedTags: [],
				denied: true,
				reason: 'Action blocked by admin',
			});
		});

		it('should suspend for confirmation when permission requires approval', async () => {
			const context = createMockContext();
			const suspend = vi.fn();

			const tool = createWorkspaceTool(context);
			await executeTool(
				tool,
				{ action: 'tag-workflow', workflowId: 'wf1', workflowName: 'My WF', tags: ['prod'] },
				{ suspend, resumeData: undefined } as never,
			);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('My WF'),
				severity: 'info',
			});
		});

		it('should execute when approved via resume', async () => {
			const context = createMockContext();
			(context.workspaceService!.tagWorkflow as Mock).mockResolvedValue(['prod']);

			const tool = createWorkspaceTool(context);
			const result = await executeTool(
				tool,
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ resumeData: { approved: true } } as never,
			);

			expect(context.workspaceService!.tagWorkflow).toHaveBeenCalledWith('wf1', ['prod']);
			expect(result).toEqual({ appliedTags: ['prod'] });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();
			const tool = createWorkspaceTool(context);

			const result = await executeTool(
				tool,
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ resumeData: { approved: false } } as never,
			);

			expect(result).toEqual({
				appliedTags: [],
				denied: true,
				reason: 'User denied the action',
			});
		});

		it('should skip confirmation when always_allow', async () => {
			const context = createMockContext({
				permissions: { tagWorkflow: 'always_allow' },
			});
			(context.workspaceService!.tagWorkflow as Mock).mockResolvedValue(['prod']);

			const tool = createWorkspaceTool(context);
			const result = await executeTool(
				tool,
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ resumeData: undefined } as never,
			);

			expect(context.workspaceService!.tagWorkflow).toHaveBeenCalledWith('wf1', ['prod']);
			expect(result).toEqual({ appliedTags: ['prod'] });
		});
	});

	describe('folder actions', () => {
		it('should accept folder actions when listFolders is present', async () => {
			const context = createMockContext();
			const folders = [{ id: 'f1', name: 'Test Folder', parentFolderId: null }];
			context.workspaceService!.listFolders = vi.fn().mockResolvedValue(folders);
			context.workspaceService!.createFolder = vi.fn();
			context.workspaceService!.deleteFolder = vi.fn();
			context.workspaceService!.moveWorkflowToFolder = vi.fn();

			const tool = createWorkspaceTool(context);
			const result = await executeTool(
				tool,
				{ action: 'list-folders', projectId: 'p1' } as never,
				{} as never,
			);

			expect(result).toEqual({ folders });
		});
	});

	describe('delete-folder', () => {
		it('should suspend with destructive severity for confirmation', async () => {
			const context = createMockContext();
			context.workspaceService!.listFolders = vi.fn();
			context.workspaceService!.createFolder = vi.fn();
			context.workspaceService!.deleteFolder = vi.fn();
			context.workspaceService!.moveWorkflowToFolder = vi.fn();

			const suspend = vi.fn();
			const tool = createWorkspaceTool(context);

			await executeTool(
				tool,
				{
					action: 'delete-folder',
					folderId: 'f1',
					folderName: 'Old Folder',
					projectId: 'p1',
				},
				{ suspend, resumeData: undefined } as never,
			);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				severity: 'destructive',
				message: expect.stringContaining('Old Folder'),
			});
		});

		it('should execute deletion when approved', async () => {
			const context = createMockContext();
			const deleteFolder = vi.fn().mockResolvedValue(undefined);
			context.workspaceService!.listFolders = vi.fn();
			context.workspaceService!.createFolder = vi.fn();
			context.workspaceService!.deleteFolder = deleteFolder;
			context.workspaceService!.moveWorkflowToFolder = vi.fn();

			const tool = createWorkspaceTool(context);
			const result = await executeTool(
				tool,
				{ action: 'delete-folder', folderId: 'f1', projectId: 'p1' },
				{ resumeData: { approved: true } } as never,
			);

			expect(deleteFolder).toHaveBeenCalledWith('f1', 'p1', undefined);
			expect(result).toEqual({ success: true });
		});
	});

	describe('cleanup-test-executions', () => {
		it('should execute when always_allow', async () => {
			const context = createMockContext({
				permissions: { cleanupTestExecutions: 'always_allow' },
			});
			(context.workspaceService!.cleanupTestExecutions as Mock).mockResolvedValue({
				deletedCount: 5,
			});

			const tool = createWorkspaceTool(context);
			const result = await executeTool(
				tool,
				{ action: 'cleanup-test-executions', workflowId: 'wf1' },
				{
					resumeData: undefined,
				} as never,
			);

			expect(context.workspaceService!.cleanupTestExecutions).toHaveBeenCalledWith('wf1', {
				olderThanHours: undefined,
			});
			expect(result).toEqual({ deletedCount: 5 });
		});
	});
});
