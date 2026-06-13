import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { PendingCallsManager } from '../PendingCallsManager';
import type { ToolInvocationResponse } from '../PendingCallsManager';

describe('PendingCallsManager', () => {
	const mockLogger = mock<Logger>({
		scoped: vi.fn().mockReturnThis(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	});
	const timeoutMs = 1000;

	let manager: PendingCallsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		manager = new PendingCallsManager(mockLogger, timeoutMs);
	});

	afterEach(() => {
		vi.useRealTimers();
		manager.clearAll();
	});

	describe('createPendingCall', () => {
		it('should create a pending call and return callId and promise', () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			expect(callId).toBeDefined();
			expect(typeof callId).toBe('string');
			expect(promise).toBeInstanceOf(Promise);
			expect(manager.getPendingCallsCount()).toBe(1);
		});

		it('should create pending call with session ID', () => {
			const sessionId = 'test-session';
			const { callId, promise } = manager.createPendingCall(
				'testTool',
				{ param: 'value' },
				sessionId,
			);

			expect(callId).toBeDefined();
			expect(promise).toBeInstanceOf(Promise);
		});

		it('should generate unique call IDs', () => {
			const { callId: callId1 } = manager.createPendingCall('tool1', {});
			const { callId: callId2 } = manager.createPendingCall('tool2', {});
			const { callId: callId3 } = manager.createPendingCall('tool3', {});

			expect(callId1).not.toBe(callId2);
			expect(callId2).not.toBe(callId3);
			expect(callId1).not.toBe(callId3);
		});

		it('should track multiple pending calls', () => {
			manager.createPendingCall('tool1', {});
			manager.createPendingCall('tool2', {});
			manager.createPendingCall('tool3', {});

			expect(manager.getPendingCallsCount()).toBe(3);
		});
	});

	describe('resolveCall', () => {
		it('should resolve pending call with result', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			manager.resolveCall(callId, 'test result');

			const result = await promise;
			expect(result).toBe('test result');
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should clear timeout when resolving', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			manager.resolveCall(callId, 'test result');

			await promise;

			vi.advanceTimersByTime(timeoutMs + 100);

			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should log warning when resolving non-existent call', () => {
			manager.resolveCall('non-existent-id', 'result');

			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('non-existent call'));
		});
	});

	describe('rejectCall', () => {
		it('should reject pending call with error', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			const error = new Error('Test error');
			manager.rejectCall(callId, error);

			await expect(promise).rejects.toThrow('Test error');
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should clear timeout when rejecting', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			manager.rejectCall(callId, new Error('Test error'));

			await expect(promise).rejects.toThrow('Test error');

			vi.advanceTimersByTime(timeoutMs + 100);

			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should log warning when rejecting non-existent call', () => {
			manager.rejectCall('non-existent-id', new Error('error'));

			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('non-existent call'));
		});
	});

	describe('handleResponse', () => {
		it('should resolve call on successful response', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			const response: ToolInvocationResponse = {
				callId,
				success: true,
				result: 'success result',
			};

			manager.handleResponse(response);

			const result = await promise;
			expect(result).toBe('success result');
		});

		it('should reject call on error response', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			const response: ToolInvocationResponse = {
				callId,
				success: false,
				error: 'Error message',
			};

			manager.handleResponse(response);

			await expect(promise).rejects.toThrow('Error message');
		});

		it('should handle response with undefined error message', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			const response: ToolInvocationResponse = {
				callId,
				success: false,
			};

			manager.handleResponse(response);

			await expect(promise).rejects.toThrow('Unknown error during tool invocation');
		});
	});

	describe('timeout mechanism', () => {
		it('should reject call when timeout expires', async () => {
			const { promise } = manager.createPendingCall('testTool', { param: 'value' });

			vi.advanceTimersByTime(timeoutMs);

			await expect(promise).rejects.toThrow(`Tool invocation timeout after ${timeoutMs}ms`);
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should not timeout if resolved before timeout', async () => {
			const { callId, promise } = manager.createPendingCall('testTool', { param: 'value' });

			vi.advanceTimersByTime(timeoutMs / 2);

			manager.resolveCall(callId, 'result');

			const result = await promise;
			expect(result).toBe('result');

			vi.advanceTimersByTime(timeoutMs);
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should handle multiple timeouts independently', async () => {
			const { promise: promise1 } = manager.createPendingCall('tool1', {});
			const { promise: promise2 } = manager.createPendingCall('tool2', {});
			const { callId: callId3, promise: promise3 } = manager.createPendingCall('tool3', {});

			expect(manager.getPendingCallsCount()).toBe(3);

			manager.resolveCall(callId3, 'result3');
			await promise3;

			vi.advanceTimersByTime(timeoutMs);

			await expect(promise1).rejects.toThrow('timeout');
			await expect(promise2).rejects.toThrow('timeout');
			expect(manager.getPendingCallsCount()).toBe(0);
		});
	});

	describe('getRequest', () => {
		it('should return request data for existing call', () => {
			const toolName = 'testTool';
			const args = { param: 'value' };
			const { callId } = manager.createPendingCall(toolName, args);

			const request = manager.getRequest(callId);

			expect(request).toEqual({
				callId,
				toolName,
				args,
			});
		});

		it('should return null for non-existent call', () => {
			const request = manager.getRequest('non-existent-id');

			expect(request).toBeNull();
		});
	});

	describe('getPendingCallsCount', () => {
		it('should return zero for empty manager', () => {
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should return correct count for multiple calls', () => {
			manager.createPendingCall('tool1', {});
			expect(manager.getPendingCallsCount()).toBe(1);

			manager.createPendingCall('tool2', {});
			expect(manager.getPendingCallsCount()).toBe(2);

			manager.createPendingCall('tool3', {});
			expect(manager.getPendingCallsCount()).toBe(3);
		});

		it('should update count when calls are resolved', () => {
			const { callId: callId1 } = manager.createPendingCall('tool1', {});
			const { callId: callId2 } = manager.createPendingCall('tool2', {});

			expect(manager.getPendingCallsCount()).toBe(2);

			manager.resolveCall(callId1, 'result');
			expect(manager.getPendingCallsCount()).toBe(1);

			manager.resolveCall(callId2, 'result');
			expect(manager.getPendingCallsCount()).toBe(0);
		});
	});

	describe('clearAll', () => {
		it('should reject all pending calls', async () => {
			const { promise: promise1 } = manager.createPendingCall('tool1', {});
			const { promise: promise2 } = manager.createPendingCall('tool2', {});
			const { promise: promise3 } = manager.createPendingCall('tool3', {});

			expect(manager.getPendingCallsCount()).toBe(3);

			manager.clearAll();

			await expect(promise1).rejects.toThrow('Pending calls manager shutting down');
			await expect(promise2).rejects.toThrow('Pending calls manager shutting down');
			await expect(promise3).rejects.toThrow('Pending calls manager shutting down');
			expect(manager.getPendingCallsCount()).toBe(0);
		});

		it('should clear all timeouts', () => {
			manager.createPendingCall('tool1', {});
			manager.createPendingCall('tool2', {});

			manager.clearAll();

			vi.advanceTimersByTime(timeoutMs + 100);

			expect(manager.getPendingCallsCount()).toBe(0);
		});
	});

	describe('cleanupExpired', () => {
		it('should remove expired calls based on maxAge', async () => {
			// Use a longer timeout to prevent automatic timeout from interfering
			const longTimeoutManager = new PendingCallsManager(mockLogger, 10000);
			const maxAge = 2000;

			const { promise: promise1 } = longTimeoutManager.createPendingCall('tool1', {});

			vi.advanceTimersByTime(maxAge / 2);

			const { callId: callId2 } = longTimeoutManager.createPendingCall('tool2', {});

			vi.advanceTimersByTime(maxAge / 2 + 100);

			longTimeoutManager.cleanupExpired(maxAge);

			await expect(promise1).rejects.toThrow('Pending call expired');

			expect(longTimeoutManager.getPendingCallsCount()).toBe(1);

			longTimeoutManager.resolveCall(callId2, 'result');
			expect(longTimeoutManager.getPendingCallsCount()).toBe(0);
			longTimeoutManager.clearAll();
		});

		it('should not remove calls within maxAge window', () => {
			// Use a longer timeout to prevent automatic timeout from interfering
			const longTimeoutManager = new PendingCallsManager(mockLogger, 10000);
			const maxAge = 5000;

			longTimeoutManager.createPendingCall('tool1', {});
			longTimeoutManager.createPendingCall('tool2', {});

			vi.advanceTimersByTime(maxAge / 2);

			longTimeoutManager.cleanupExpired(maxAge);

			expect(longTimeoutManager.getPendingCallsCount()).toBe(2);
			longTimeoutManager.clearAll();
		});

		it('should use default maxAge if not specified', async () => {
			// Use a very long timeout to prevent automatic timeout from interfering
			const longTimeoutManager = new PendingCallsManager(mockLogger, 70000);
			const { promise } = longTimeoutManager.createPendingCall('tool1', {});

			vi.advanceTimersByTime(60000 + 100);

			longTimeoutManager.cleanupExpired();

			await expect(promise).rejects.toThrow('Pending call expired');
			expect(longTimeoutManager.getPendingCallsCount()).toBe(0);
			longTimeoutManager.clearAll();
		});
	});
});
