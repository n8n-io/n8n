import type { InstanceAiPermissions } from '@n8n/api-types';

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
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		workspaceService: {
			listProjects: jest.fn(),
			listTags: jest.fn(),
			tagWorkflow: jest.fn(),
			createTag: jest.fn(),
			cleanupTestExecutions: jest.fn(),
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

			const result = await tool.execute!({ action: 'list-projects' }, {} as never);

			expect(result).toEqual({ error: 'Workspace service is not available in this environment.' });
		});
	});

	describe('list-projects', () => {
		it('should call workspaceService.listProjects and return result', async () => {
			const projects = [{ id: 'p1', name: 'Project 1', type: 'team' as const }];
			const context = createMockContext();
			(context.workspaceService!.listProjects as jest.Mock).mockResolvedValue(projects);

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!({ action: 'list-projects' }, {} as never);

			expect(context.workspaceService!.listProjects).toHaveBeenCalled();
			expect(result).toEqual({ projects });
		});
	});

	describe('list-tags', () => {
		it('should call workspaceService.listTags and return result', async () => {
			const tags = [{ id: 't1', name: 'production' }];
			const context = createMockContext();
			(context.workspaceService!.listTags as jest.Mock).mockResolvedValue(tags);

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!({ action: 'list-tags' }, {} as never);

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

			const result = await tool.execute!(
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
			const suspend = jest.fn();

			const tool = createWorkspaceTool(context);
			await tool.execute!(
				{ action: 'tag-workflow', workflowId: 'wf1', workflowName: 'My WF', tags: ['prod'] },
				{ agent: { suspend, resumeData: undefined } } as never,
			);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('My WF'),
				severity: 'info',
			});
		});

		it('should execute when approved via resume', async () => {
			const context = createMockContext();
			(context.workspaceService!.tagWorkflow as jest.Mock).mockResolvedValue(['prod']);

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!(
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ agent: { resumeData: { approved: true } } } as never,
			);

			expect(context.workspaceService!.tagWorkflow).toHaveBeenCalledWith('wf1', ['prod']);
			expect(result).toEqual({ appliedTags: ['prod'] });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();
			const tool = createWorkspaceTool(context);

			const result = await tool.execute!(
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ agent: { resumeData: { approved: false } } } as never,
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
			(context.workspaceService!.tagWorkflow as jest.Mock).mockResolvedValue(['prod']);

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!(
				{ action: 'tag-workflow', workflowId: 'wf1', tags: ['prod'] },
				{ agent: { resumeData: undefined } } as never,
			);

			expect(context.workspaceService!.tagWorkflow).toHaveBeenCalledWith('wf1', ['prod']);
			expect(result).toEqual({ appliedTags: ['prod'] });
		});
	});

	describe('folder actions', () => {
		it('should accept folder actions when listFolders is present', async () => {
			const context = createMockContext();
			const folders = [{ id: 'f1', name: 'Test Folder', parentFolderId: null }];
			context.workspaceService!.listFolders = jest.fn().mockResolvedValue(folders);
			context.workspaceService!.createFolder = jest.fn();
			context.workspaceService!.deleteFolder = jest.fn();
			context.workspaceService!.moveWorkflowToFolder = jest.fn();

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!(
				{ action: 'list-folders', projectId: 'p1' } as never,
				{} as never,
			);

			expect(result).toEqual({ folders });
		});
	});

	describe('delete-folder', () => {
		it('should suspend with destructive severity for confirmation', async () => {
			const context = createMockContext();
			context.workspaceService!.listFolders = jest.fn();
			context.workspaceService!.createFolder = jest.fn();
			context.workspaceService!.deleteFolder = jest.fn();
			context.workspaceService!.moveWorkflowToFolder = jest.fn();

			const suspend = jest.fn();
			const tool = createWorkspaceTool(context);

			await tool.execute!(
				{
					action: 'delete-folder',
					folderId: 'f1',
					folderName: 'Old Folder',
					projectId: 'p1',
				},
				{ agent: { suspend, resumeData: undefined } } as never,
			);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				severity: 'destructive',
				message: expect.stringContaining('Old Folder'),
			});
		});

		it('should execute deletion when approved', async () => {
			const context = createMockContext();
			const deleteFolder = jest.fn().mockResolvedValue(undefined);
			context.workspaceService!.listFolders = jest.fn();
			context.workspaceService!.createFolder = jest.fn();
			context.workspaceService!.deleteFolder = deleteFolder;
			context.workspaceService!.moveWorkflowToFolder = jest.fn();

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!(
				{ action: 'delete-folder', folderId: 'f1', projectId: 'p1' },
				{ agent: { resumeData: { approved: true } } } as never,
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
			(context.workspaceService!.cleanupTestExecutions as jest.Mock).mockResolvedValue({
				deletedCount: 5,
			});

			const tool = createWorkspaceTool(context);
			const result = await tool.execute!({ action: 'cleanup-test-executions', workflowId: 'wf1' }, {
				agent: { resumeData: undefined },
			} as never);

			expect(context.workspaceService!.cleanupTestExecutions).toHaveBeenCalledWith('wf1', {
				olderThanHours: undefined,
			});
			expect(result).toEqual({ deletedCount: 5 });
		});
	});
});
