import type { InstanceAiContext } from '../../../types';
import { createListWorkflowVersionsTool } from '../list-workflow-versions.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockVersions = [
	{
		versionId: 'v-1',
		name: 'Initial',
		description: 'First version',
		authors: 'user@example.com',
		createdAt: '2025-06-01T12:00:00.000Z',
		autosaved: false,
		isActive: true,
		isCurrentDraft: false,
	},
	{
		versionId: 'v-2',
		name: null,
		description: null,
		authors: 'user@example.com',
		createdAt: '2025-06-02T12:00:00.000Z',
		autosaved: true,
		isActive: false,
		isCurrentDraft: true,
	},
];

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn().mockResolvedValue({ activeVersionId: 'v-active-1' }),
			unpublish: jest.fn(),
			listVersions: jest.fn().mockResolvedValue(mockVersions),
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
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createListWorkflowVersionsTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createListWorkflowVersionsTool(context);

		expect(tool.id).toBe('list-workflow-versions');
	});

	it('returns versions from the service', async () => {
		const tool = createListWorkflowVersionsTool(context);

		const result = await tool.execute!({ workflowId: 'wf-123' }, {} as never);

		expect(context.workflowService.listVersions).toHaveBeenCalledWith('wf-123', {
			limit: undefined,
			skip: undefined,
		});
		expect(result).toEqual({ versions: mockVersions });
	});

	it('passes limit and skip to the service', async () => {
		const tool = createListWorkflowVersionsTool(context);

		await tool.execute!({ workflowId: 'wf-123', limit: 5, skip: 10 }, {} as never);

		expect(context.workflowService.listVersions).toHaveBeenCalledWith('wf-123', {
			limit: 5,
			skip: 10,
		});
	});

	it('propagates service errors', async () => {
		(context.workflowService.listVersions as jest.Mock).mockRejectedValue(new Error('Not found'));
		const tool = createListWorkflowVersionsTool(context);

		await expect(tool.execute!({ workflowId: 'wf-123' }, {} as never)).rejects.toThrow('Not found');
	});
});
