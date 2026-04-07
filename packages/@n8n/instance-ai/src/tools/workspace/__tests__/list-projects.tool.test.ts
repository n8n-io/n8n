import type { InstanceAiContext } from '../../../types';
import { createListProjectsTool, listProjectsInputSchema } from '../list-projects.tool';

function createMockContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		workspaceService: {
			listProjects: jest.fn(),
			listFolders: jest.fn(),
			createFolder: jest.fn(),
			deleteFolder: jest.fn(),
			moveWorkflowToFolder: jest.fn(),
			tagWorkflow: jest.fn(),
			listTags: jest.fn(),
			createTag: jest.fn(),
			cleanupTestExecutions: jest.fn(),
		},
	};
}

describe('list-projects tool', () => {
	describe('schema validation', () => {
		it('accepts empty input', () => {
			const result = listProjectsInputSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('execute', () => {
		it('returns projects from the workspace service', async () => {
			const context = createMockContext();
			const mockProjects = [
				{ id: 'p1', name: 'My Project', type: 'personal' as const },
				{ id: 'p2', name: 'Team Project', type: 'team' as const },
			];
			(context.workspaceService!.listProjects as jest.Mock).mockResolvedValue(mockProjects);

			const tool = createListProjectsTool(context);
			const result = (await tool.execute!({}, {} as never)) as Record<string, unknown>;

			expect(context.workspaceService!.listProjects).toHaveBeenCalled();
			expect(result).toEqual({ projects: mockProjects });
		});

		it('returns empty array when no projects exist', async () => {
			const context = createMockContext();
			(context.workspaceService!.listProjects as jest.Mock).mockResolvedValue([]);

			const tool = createListProjectsTool(context);
			const result = (await tool.execute!({}, {} as never)) as Record<string, unknown>;

			expect(result).toEqual({ projects: [] });
		});
	});
});
