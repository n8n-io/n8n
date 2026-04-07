import type { InstanceAiContext, ExecutionSummary } from '../../../types';
import { createListExecutionsTool, listExecutionsInputSchema } from '../list-executions.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
	};
}

const mockExecutions: ExecutionSummary[] = [
	{
		id: 'exec-1',
		workflowId: 'wf-1',
		workflowName: 'My Workflow',
		status: 'success',
		startedAt: '2026-03-10T10:00:00.000Z',
		finishedAt: '2026-03-10T10:00:05.000Z',
		mode: 'manual',
	},
	{
		id: 'exec-2',
		workflowId: 'wf-2',
		workflowName: 'Another Workflow',
		status: 'error',
		startedAt: '2026-03-10T09:00:00.000Z',
		finishedAt: '2026-03-10T09:00:03.000Z',
		mode: 'trigger',
	},
	{
		id: 'exec-3',
		workflowId: 'wf-1',
		workflowName: 'My Workflow',
		status: 'running',
		startedAt: '2026-03-10T11:00:00.000Z',
		mode: 'manual',
	},
];

interface ListExecutionsOutput {
	executions: ExecutionSummary[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('list-executions tool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		jest.clearAllMocks();
		context = createMockContext();
	});

	describe('schema validation', () => {
		it('accepts empty input (all fields optional)', () => {
			const result = listExecutionsInputSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('accepts workflowId filter', () => {
			const result = listExecutionsInputSchema.safeParse({ workflowId: 'wf-1' });
			expect(result.success).toBe(true);
		});

		it('accepts status filter', () => {
			const result = listExecutionsInputSchema.safeParse({ status: 'error' });
			expect(result.success).toBe(true);
		});

		it('accepts limit', () => {
			const result = listExecutionsInputSchema.safeParse({ limit: 10 });
			expect(result.success).toBe(true);
		});

		it('rejects limit over 100', () => {
			const result = listExecutionsInputSchema.safeParse({ limit: 101 });
			expect(result.success).toBe(false);
		});

		it('rejects limit of 0', () => {
			const result = listExecutionsInputSchema.safeParse({ limit: 0 });
			expect(result.success).toBe(false);
		});

		it('rejects non-integer limit', () => {
			const result = listExecutionsInputSchema.safeParse({ limit: 5.5 });
			expect(result.success).toBe(false);
		});

		it('accepts all filters combined', () => {
			const result = listExecutionsInputSchema.safeParse({
				workflowId: 'wf-1',
				status: 'success',
				limit: 50,
			});
			expect(result.success).toBe(true);
		});
	});

	describe('execute', () => {
		it('returns executions from the service', async () => {
			(context.executionService.list as jest.Mock).mockResolvedValue(mockExecutions);
			const tool = createListExecutionsTool(context);

			const result = (await tool.execute!({}, {} as never)) as ListExecutionsOutput;

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: undefined,
				status: undefined,
				limit: undefined,
			});
			expect(result.executions).toHaveLength(3);
			expect(result.executions[0].id).toBe('exec-1');
			expect(result.executions[0].workflowName).toBe('My Workflow');
			expect(result.executions[0].status).toBe('success');
		});

		it('passes workflowId filter to the service', async () => {
			const filtered = mockExecutions.filter((e) => e.workflowId === 'wf-1');
			(context.executionService.list as jest.Mock).mockResolvedValue(filtered);
			const tool = createListExecutionsTool(context);

			const result = (await tool.execute!(
				{ workflowId: 'wf-1' },
				{} as never,
			)) as unknown as ListExecutionsOutput;

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				status: undefined,
				limit: undefined,
			});
			expect(result.executions).toHaveLength(2);
			expect(result.executions.every((e) => e.workflowId === 'wf-1')).toBe(true);
		});

		it('passes status filter to the service', async () => {
			const filtered = mockExecutions.filter((e) => e.status === 'error');
			(context.executionService.list as jest.Mock).mockResolvedValue(filtered);
			const tool = createListExecutionsTool(context);

			const result = (await tool.execute!(
				{ status: 'error' },
				{} as never,
			)) as unknown as ListExecutionsOutput;

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: undefined,
				status: 'error',
				limit: undefined,
			});
			expect(result.executions).toHaveLength(1);
			expect(result.executions[0].status).toBe('error');
		});

		it('passes limit to the service', async () => {
			(context.executionService.list as jest.Mock).mockResolvedValue([mockExecutions[0]]);
			const tool = createListExecutionsTool(context);

			const result = (await tool.execute!({ limit: 1 }, {} as never)) as ListExecutionsOutput;

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: undefined,
				status: undefined,
				limit: 1,
			});
			expect(result.executions).toHaveLength(1);
		});

		it('returns empty array when no executions match', async () => {
			(context.executionService.list as jest.Mock).mockResolvedValue([]);
			const tool = createListExecutionsTool(context);

			const result = (await tool.execute!(
				{ workflowId: 'nonexistent' },
				{} as never,
			)) as unknown as ListExecutionsOutput;

			expect(result.executions).toEqual([]);
		});

		it('propagates service errors', async () => {
			(context.executionService.list as jest.Mock).mockRejectedValue(
				new Error('Service unavailable'),
			);
			const tool = createListExecutionsTool(context);

			await expect(tool.execute!({}, {} as never)).rejects.toThrow('Service unavailable');
		});
	});
});
