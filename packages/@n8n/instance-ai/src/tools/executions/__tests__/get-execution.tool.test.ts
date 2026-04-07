import type { InstanceAiContext, ExecutionResult } from '../../../types';
import { createGetExecutionTool } from '../get-execution.tool';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('get-execution tool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		jest.clearAllMocks();
		context = createMockContext();
	});

	describe('schema validation', () => {
		it('accepts a valid executionId', () => {
			const tool = createGetExecutionTool(context);
			const result = tool.inputSchema!.safeParse({ executionId: 'exec-123' });
			expect(result.success).toBe(true);
		});

		it('rejects missing executionId', () => {
			const tool = createGetExecutionTool(context);
			const result = tool.inputSchema!.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns status for a running execution', async () => {
			const runningExecution: ExecutionResult = {
				executionId: 'exec-123',
				status: 'running',
				startedAt: '2026-03-10T10:00:00.000Z',
			};
			(context.executionService.getStatus as jest.Mock).mockResolvedValue(runningExecution);
			const tool = createGetExecutionTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-123' },
				{} as never,
			)) as ExecutionResult;

			expect(context.executionService.getStatus).toHaveBeenCalledWith('exec-123');
			expect(result.executionId).toBe('exec-123');
			expect(result.status).toBe('running');
			expect(result.startedAt).toBe('2026-03-10T10:00:00.000Z');
			expect(result.finishedAt).toBeUndefined();
		});

		it('returns status and data for a successful execution', async () => {
			const successExecution: ExecutionResult = {
				executionId: 'exec-456',
				status: 'success',
				data: { output: 'Hello World' },
				startedAt: '2026-03-10T10:00:00.000Z',
				finishedAt: '2026-03-10T10:00:05.000Z',
			};
			(context.executionService.getStatus as jest.Mock).mockResolvedValue(successExecution);
			const tool = createGetExecutionTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-456' },
				{} as never,
			)) as ExecutionResult;

			expect(context.executionService.getStatus).toHaveBeenCalledWith('exec-456');
			expect(result.executionId).toBe('exec-456');
			expect(result.status).toBe('success');
			expect(result.data).toEqual({ output: 'Hello World' });
			expect(result.finishedAt).toBe('2026-03-10T10:00:05.000Z');
		});

		it('returns status and error for a failed execution', async () => {
			const errorExecution: ExecutionResult = {
				executionId: 'exec-789',
				status: 'error',
				error: 'Node "HTTP Request" failed: 404 Not Found',
				startedAt: '2026-03-10T10:00:00.000Z',
				finishedAt: '2026-03-10T10:00:02.000Z',
			};
			(context.executionService.getStatus as jest.Mock).mockResolvedValue(errorExecution);
			const tool = createGetExecutionTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-789' },
				{} as never,
			)) as ExecutionResult;

			expect(result.executionId).toBe('exec-789');
			expect(result.status).toBe('error');
			expect(result.error).toBe('Node "HTTP Request" failed: 404 Not Found');
		});

		it('returns status for a waiting execution', async () => {
			const waitingExecution: ExecutionResult = {
				executionId: 'exec-wait',
				status: 'waiting',
				startedAt: '2026-03-10T10:00:00.000Z',
			};
			(context.executionService.getStatus as jest.Mock).mockResolvedValue(waitingExecution);
			const tool = createGetExecutionTool(context);

			const result = (await tool.execute!(
				{ executionId: 'exec-wait' },
				{} as never,
			)) as ExecutionResult;

			expect(result.executionId).toBe('exec-wait');
			expect(result.status).toBe('waiting');
		});

		it('propagates service errors', async () => {
			(context.executionService.getStatus as jest.Mock).mockRejectedValue(
				new Error('Execution not found'),
			);
			const tool = createGetExecutionTool(context);

			await expect(tool.execute!({ executionId: 'nonexistent' }, {} as never)).rejects.toThrow(
				'Execution not found',
			);
		});
	});
});
