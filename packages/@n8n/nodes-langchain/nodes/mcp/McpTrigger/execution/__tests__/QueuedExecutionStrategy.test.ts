<<<<<<< HEAD
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamicTool } from '@langchain/core/tools';
import type { Tool } from '@langchain/core/tools';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { QueuedExecutionStrategy } from '../QueuedExecutionStrategy';
import type { ToolInvocationRequest, ToolInvocationResponse } from '../PendingCallsManager';

describe('QueuedExecutionStrategy', () => {
	const mockLogger = mock<Logger>({
		scoped: vi.fn().mockReturnThis(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	});
	const sessionId = 'test-session-id';
	const timeoutMs = 5000;

	let mockSendToolInvocation: ReturnType<
		typeof vi.fn<(request: ToolInvocationRequest) => Promise<void>>
	>;
	let strategy: QueuedExecutionStrategy;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSendToolInvocation = vi.fn().mockResolvedValue(undefined);
		strategy = new QueuedExecutionStrategy(
			mockLogger,
			mockSendToolInvocation,
			sessionId,
			timeoutMs,
		);
	});

	afterEach(async () => {
		await strategy.cleanup();
	});

	describe('constructor', () => {
		it('should create an instance with provided parameters', () => {
			expect(strategy).toBeInstanceOf(QueuedExecutionStrategy);
		});

		it('should use default timeout when not specified', () => {
			const strategyWithDefaultTimeout = new QueuedExecutionStrategy(
				mockLogger,
				mockSendToolInvocation,
				sessionId,
			);

			expect(strategyWithDefaultTimeout).toBeInstanceOf(QueuedExecutionStrategy);
		});
	});

	describe('executeTool', () => {
		it('should throw error when called directly', async () => {
			const mockTool = mock<Tool>();

			await expect(strategy.executeTool(mockTool, {})).rejects.toThrow(
				'executeTool should not be called directly in queue mode',
=======
import type { Mocked } from 'vitest';

import { createMockTool } from '../../__tests__/helpers';
import type { PendingCallsManager } from '../PendingCallsManager';
import { QueuedExecutionStrategy } from '../QueuedExecutionStrategy';

describe('QueuedExecutionStrategy', () => {
	let strategy: QueuedExecutionStrategy;
	let mockPendingCalls: Mocked<PendingCallsManager>;

	beforeEach(() => {
		mockPendingCalls = {
			waitForResult: vi.fn(),
			resolve: vi.fn(),
			reject: vi.fn(),
			get: vi.fn(),
			has: vi.fn(),
			remove: vi.fn(),
			cleanupBySessionId: vi.fn(),
		} as unknown as Mocked<PendingCallsManager>;

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
>>>>>>> upstream/master
			);
		});
	});

<<<<<<< HEAD
	describe('prepareTools', () => {
		it('should create proxy tools with same names and descriptions', () => {
			const mockTools: Tool[] = [
				mock<Tool>({ name: 'tool1', description: 'Description 1' }),
				mock<Tool>({ name: 'tool2', description: 'Description 2' }),
			];

			const proxyTools = strategy.prepareTools(mockTools);

			expect(proxyTools).toHaveLength(2);
			expect(proxyTools[0].name).toBe('tool1');
			expect(proxyTools[0].description).toBe('Description 1');
			expect(proxyTools[1].name).toBe('tool2');
			expect(proxyTools[1].description).toBe('Description 2');
		});

		it('should create DynamicTool instances', () => {
			const mockTools: Tool[] = [mock<Tool>({ name: 'tool1', description: 'Description 1' })];

			const proxyTools = strategy.prepareTools(mockTools);

			expect(proxyTools[0]).toBeInstanceOf(DynamicTool);
		});

		it('should handle empty tools array', () => {
			const proxyTools = strategy.prepareTools([]);

			expect(proxyTools).toHaveLength(0);
		});
	});

	describe('proxy tool invocation', () => {
		it('should send RPC request when proxy tool is invoked', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke(JSON.stringify({ param: 'value' }));

			await vi.waitFor(() => {
				expect(mockSendToolInvocation).toHaveBeenCalledTimes(1);
			});

			const request = mockSendToolInvocation.mock.calls[0]?.[0] as ToolInvocationRequest;
			expect(request).toBeDefined();
			expect(request.toolName).toBe('testTool');
			expect(request.args).toEqual({ param: 'value' });
			expect(request.sessionId).toBe(sessionId);
			expect(request.callId).toBeDefined();

			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: true,
				result: 'test result',
			};
			strategy.handleResponse(response);

			const result = await invocationPromise;
			expect(result).toBe('test result');
		});

		it('should parse stringified JSON input', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke('{"param": "value"}');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendToolInvocation).toHaveBeenCalledTimes(1);
			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			expect(request.args).toEqual({ param: 'value' });

			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: true,
				result: 'parsed result',
			};
			strategy.handleResponse(response);

			await invocationPromise;
		});

		it('should handle non-JSON string input', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke('plain text input');

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendToolInvocation).toHaveBeenCalledTimes(1);
			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			expect(request.args).toEqual({ input: 'plain text input' });

			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: true,
				result: 'result',
			};
			strategy.handleResponse(response);

			await invocationPromise;
		});

		it('should handle multiple concurrent tool invocations', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const promise1 = proxyTool.invoke({ call: 1 });
			const promise2 = proxyTool.invoke({ call: 2 });
			const promise3 = proxyTool.invoke({ call: 3 });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendToolInvocation).toHaveBeenCalledTimes(3);

			const request1 = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			const request2 = mockSendToolInvocation.mock.calls[1][0] as ToolInvocationRequest;
			const request3 = mockSendToolInvocation.mock.calls[2][0] as ToolInvocationRequest;

			strategy.handleResponse({ callId: request1.callId, success: true, result: 'result1' });
			strategy.handleResponse({ callId: request2.callId, success: true, result: 'result2' });
			strategy.handleResponse({ callId: request3.callId, success: true, result: 'result3' });

			const results = await Promise.all([promise1, promise2, promise3]);
			expect(results).toEqual(['result1', 'result2', 'result3']);
		});
	});

	describe('handleResponse', () => {
		it('should resolve pending call on successful response', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke({ param: 'value' });

			await new Promise((resolve) => setTimeout(resolve, 10));

			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: true,
				result: 'successful result',
			};

			strategy.handleResponse(response);

			const result = await invocationPromise;
			expect(result).toBe('successful result');
		});

		it('should reject pending call on error response', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke({ param: 'value' });

			await new Promise((resolve) => setTimeout(resolve, 10));

			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: false,
				error: 'Tool execution failed',
			};

			strategy.handleResponse(response);

			await expect(invocationPromise).rejects.toThrow('Tool execution failed');
		});

		it('should handle response with missing error message', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const invocationPromise = proxyTool.invoke({ param: 'value' });

			await new Promise((resolve) => setTimeout(resolve, 10));

			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			const response: ToolInvocationResponse = {
				callId: request.callId,
				success: false,
			};

			strategy.handleResponse(response);

			await expect(invocationPromise).rejects.toThrow('Unknown error during tool invocation');
		});
	});

	describe('error handling', () => {
		it('should reject call when sendToolInvocation throws error', async () => {
			const errorStrategy = new QueuedExecutionStrategy(
				mockLogger,
				vi.fn().mockRejectedValue(new Error('Network error')),
				sessionId,
				timeoutMs,
			);

			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = errorStrategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			await expect(proxyTool.invoke({ param: 'value' })).rejects.toThrow(
				'Failed to send tool invocation request: Network error',
			);

			await errorStrategy.cleanup();
		});
	});

	describe('cleanup', () => {
		it('should clear all pending calls on cleanup', async () => {
			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			const promise1 = proxyTool.invoke({ call: 1 });
			const promise2 = proxyTool.invoke({ call: 2 });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(strategy.getStats().pendingCalls).toBe(2);

			await strategy.cleanup();

			expect(strategy.getStats().pendingCalls).toBe(0);

			await expect(promise1).rejects.toThrow('Pending calls manager shutting down');
			await expect(promise2).rejects.toThrow('Pending calls manager shutting down');
		});
	});

	describe('getStats', () => {
		it('should return correct pending calls count', async () => {
			expect(strategy.getStats().pendingCalls).toBe(0);

			const mockTool = mock<Tool>({ name: 'testTool', description: 'Test tool' });
			const proxyTools = strategy.prepareTools([mockTool]);
			const proxyTool = proxyTools[0];

			proxyTool.invoke({ call: 1 });
			proxyTool.invoke({ call: 2 });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(strategy.getStats().pendingCalls).toBe(2);

			const request = mockSendToolInvocation.mock.calls[0][0] as ToolInvocationRequest;
			strategy.handleResponse({ callId: request.callId, success: true, result: 'result' });

			expect(strategy.getStats().pendingCalls).toBe(1);
=======
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
>>>>>>> upstream/master
		});
	});
});
