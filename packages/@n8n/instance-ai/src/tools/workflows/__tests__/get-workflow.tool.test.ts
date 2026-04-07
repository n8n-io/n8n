import type { InstanceAiContext, WorkflowDetail } from '../../../types';
import { createGetWorkflowTool } from '../get-workflow.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
		...overrides,
	};
}

function makeWorkflowDetail(): WorkflowDetail {
	return {
		id: 'wf-123',
		name: 'Test Workflow',
		versionId: 'v-abc-123',
		activeVersionId: 'v-abc-123',
		createdAt: '2025-01-01T00:00:00.000Z',
		updatedAt: '2025-01-02T00:00:00.000Z',
		nodes: [
			{
				name: 'Start',
				type: 'n8n-nodes-base.start',
				parameters: {},
				position: [250, 300],
			},
		],
		connections: {
			Start: { main: [[{ node: 'End', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

/** The outputSchema strips fields not in the schema (createdAt, updatedAt) */
function expectedOutputFromDetail(detail: WorkflowDetail) {
	return {
		id: detail.id,
		name: detail.name,
		versionId: detail.versionId,
		activeVersionId: detail.activeVersionId,
		nodes: detail.nodes,
		connections: detail.connections,
		settings: detail.settings,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createGetWorkflowTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('returns the workflow detail for a valid workflow ID', async () => {
		const expected = makeWorkflowDetail();
		(context.workflowService.get as jest.Mock).mockResolvedValue(expected);

		const tool = createGetWorkflowTool(context);
		const result = (await tool.execute!({ workflowId: 'wf-123' }, {} as never)) as Record<
			string,
			unknown
		>;

		expect(context.workflowService.get).toHaveBeenCalledWith('wf-123');
		expect(result).toEqual(expectedOutputFromDetail(expected));
	});

	it('passes the workflowId argument to the service', async () => {
		(context.workflowService.get as jest.Mock).mockResolvedValue(makeWorkflowDetail());

		const tool = createGetWorkflowTool(context);
		await tool.execute!({ workflowId: 'other-id' }, {} as never);

		expect(context.workflowService.get).toHaveBeenCalledWith('other-id');
	});

	it('propagates errors from the workflow service', async () => {
		(context.workflowService.get as jest.Mock).mockRejectedValue(new Error('Workflow not found'));

		const tool = createGetWorkflowTool(context);

		await expect(tool.execute!({ workflowId: 'nonexistent' }, {} as never)).rejects.toThrow(
			'Workflow not found',
		);
	});

	it('has the expected tool id and description', () => {
		const tool = createGetWorkflowTool(context);

		expect(tool.id).toBe('get-workflow');
		expect(tool.description).toContain('Get full details');
	});
});
