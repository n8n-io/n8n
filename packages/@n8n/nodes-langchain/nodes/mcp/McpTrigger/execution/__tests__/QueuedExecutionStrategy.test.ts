import { createMockTool } from '../../__tests__/helpers';
import type { PendingCallsManager } from '../PendingCallsManager';
import { QueuedExecutionStrategy } from '../QueuedExecutionStrategy';

describe('QueuedExecutionStrategy', () => {
	let strategy: QueuedExecutionStrategy;
	let mockPendingCalls: jest.Mocked<PendingCallsManager>;

	beforeEach(() => {
		mockPendingCalls = {
			waitForResult: jest.fn(),
			resolve: jest.fn(),
			reject: jest.fn(),
			get: jest.fn(),
			has: jest.fn(),
			remove: jest.fn(),
			cleanupBySessionId: jest.fn(),
		} as unknown as jest.Mocked<PendingCallsManager>;

		strategy = new QueuedExecutionStrategy(mockPendingCalls);
	});

	describe('executeTool', () => {
		it('should create callId from sessionId and messageId', async () => {
			mockPendingCalls.waitForResult.mockResolvedValue('result');
			const tool = createMockTool('test-tool');

			await strategy.executeTool(
				tool,
				{ arg: 'value' },
				{ sessionId: 'session-1', messageId: 'msg-1' },
			);

			expect(mockPendingCalls.waitForResult).toHaveBeenCalledWith(
				'session-1_msg-1',
				'test-tool',
				{ arg: 'value' },
				expect.any(Number),
			);
		});

		it('should create callId from sessionId with default suffix when no messageId', async () => {
			mockPendingCalls.waitForResult.mockResolvedValue('result');
			const tool = createMockTool('test-tool');

			await strategy.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(mockPendingCalls.waitForResult).toHaveBeenCalledWith(
				'session-1_default',
				'test-tool',
				{},
				expect.any(Number),
			);
		});

		it('should return result from pending calls manager', async () => {
			mockPendingCalls.waitForResult.mockResolvedValue({ data: 'from-worker' });
			const tool = createMockTool('test-tool');

			const result = await strategy.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(result).toEqual({ data: 'from-worker' });
		});

		it('should pass tool name and arguments to waitForResult', async () => {
			mockPendingCalls.waitForResult.mockResolvedValue('result');
			const tool = createMockTool('get_weather');
			const args = { city: 'London', units: 'metric' };

			await strategy.executeTool(tool, args, { sessionId: 'session-1' });

			expect(mockPendingCalls.waitForResult).toHaveBeenCalledWith(
				expect.any(String),
				'get_weather',
				args,
				expect.any(Number),
			);
		});

		it('should use default timeout', async () => {
			mockPendingCalls.waitForResult.mockResolvedValue('result');
			const tool = createMockTool('test-tool');

			await strategy.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(mockPendingCalls.waitForResult).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				120000, // DEFAULT_TIMEOUT_MS
			);
		});

		it('should propagate errors from pending calls manager', async () => {
			mockPendingCalls.waitForResult.mockRejectedValue(new Error('Timeout'));
			const tool = createMockTool('test-tool');

			await expect(strategy.executeTool(tool, {}, { sessionId: 'session-1' })).rejects.toThrow(
				'Timeout',
			);
		});
	});

	describe('with custom timeout', () => {
		it('should use custom timeout when provided', async () => {
			const customTimeout = 60000;
			const customStrategy = new QueuedExecutionStrategy(mockPendingCalls, customTimeout);
			mockPendingCalls.waitForResult.mockResolvedValue('result');
			const tool = createMockTool('test-tool');

			await customStrategy.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(mockPendingCalls.waitForResult).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(Object),
				customTimeout,
			);
		});
	});

	describe('resolveToolCall', () => {
		it('should delegate to pendingCalls.resolve', () => {
			mockPendingCalls.resolve.mockReturnValue(true);

			const result = strategy.resolveToolCall('call-1', { success: true });

			expect(mockPendingCalls.resolve).toHaveBeenCalledWith('call-1', { success: true });
			expect(result).toBe(true);
		});

		it('should return false when call does not exist', () => {
			mockPendingCalls.resolve.mockReturnValue(false);

			const result = strategy.resolveToolCall('non-existent', 'result');

			expect(result).toBe(false);
		});
	});

	describe('rejectToolCall', () => {
		it('should delegate to pendingCalls.reject', () => {
			mockPendingCalls.reject.mockReturnValue(true);
			const error = new Error('test');

			const result = strategy.rejectToolCall('call-1', error);

			expect(mockPendingCalls.reject).toHaveBeenCalledWith('call-1', error);
			expect(result).toBe(true);
		});

		it('should return false when call does not exist', () => {
			mockPendingCalls.reject.mockReturnValue(false);

			const result = strategy.rejectToolCall('non-existent', new Error('test'));

			expect(result).toBe(false);
		});
	});

	describe('getPendingCallsManager', () => {
		it('should return the pending calls manager', () => {
			expect(strategy.getPendingCallsManager()).toBe(mockPendingCalls);
		});
	});
});
