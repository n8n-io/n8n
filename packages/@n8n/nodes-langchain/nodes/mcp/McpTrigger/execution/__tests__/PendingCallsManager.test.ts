<<<<<<< HEAD
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
=======
import { PendingCallsManager } from '../PendingCallsManager';

describe('PendingCallsManager', () => {
	let manager: PendingCallsManager;

	beforeEach(() => {
		manager = new PendingCallsManager();
		vi.useFakeTimers();
>>>>>>> upstream/master
	});

	afterEach(() => {
		vi.useRealTimers();
<<<<<<< HEAD
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
=======
	});

	describe('waitForResult', () => {
		it('should resolve when result is provided via resolve()', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 5000);

			manager.resolve('call-1', { success: true });

			await expect(resultPromise).resolves.toEqual({ success: true });
		});

		it('should reject on timeout with meaningful error', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 1000);

			vi.advanceTimersByTime(1001);

			await expect(resultPromise).rejects.toThrow('Worker tool execution timeout');
		});

		it('should track pending call while waiting', async () => {
			const promise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			expect(manager.has('call-1')).toBe(true);
			// Clean up to avoid unhandled rejection
			manager.resolve('call-1', undefined);
			await promise;
		});

		it('should remove call from pending after resolution', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			manager.resolve('call-1', 'result');
			await resultPromise;

			expect(manager.has('call-1')).toBe(false);
		});

		it('should remove call from pending after timeout', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 1000);

			vi.advanceTimersByTime(1001);

			await expect(resultPromise).rejects.toThrow();
			expect(manager.has('call-1')).toBe(false);
		});

		it('should store tool name and arguments', async () => {
			const args = { city: 'London' };
			const promise = manager.waitForResult('call-1', 'get_weather', args, 5000);

			const pendingCall = manager.get('call-1');
			expect(pendingCall).toBeDefined();
			expect(pendingCall?.toolName).toBe('get_weather');
			expect(pendingCall?.arguments).toEqual(args);
			// Clean up
			manager.resolve('call-1', undefined);
			await promise;
		});

		it('should handle multiple concurrent calls', async () => {
			const promise1 = manager.waitForResult('call-1', 'tool-1', {}, 5000);
			const promise2 = manager.waitForResult('call-2', 'tool-2', {}, 5000);
			const promise3 = manager.waitForResult('call-3', 'tool-3', {}, 5000);

			expect(manager.has('call-1')).toBe(true);
			expect(manager.has('call-2')).toBe(true);
			expect(manager.has('call-3')).toBe(true);

			manager.resolve('call-1', 'result-1');
			manager.resolve('call-2', 'result-2');
			manager.resolve('call-3', 'result-3');

			await expect(promise1).resolves.toBe('result-1');
			await expect(promise2).resolves.toBe('result-2');
			await expect(promise3).resolves.toBe('result-3');
		});
	});

	describe('resolve', () => {
		it('should return true when call exists', async () => {
			const promise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			expect(manager.resolve('call-1', 'result')).toBe(true);
			await promise;
		});

		it('should return false when call does not exist', () => {
			expect(manager.resolve('non-existent', 'result')).toBe(false);
		});

		it('should handle resolving with various result types', async () => {
			const promise1 = manager.waitForResult('call-1', 'tool', {}, 5000);
			const promise2 = manager.waitForResult('call-2', 'tool', {}, 5000);
			const promise3 = manager.waitForResult('call-3', 'tool', {}, 5000);
			const promise4 = manager.waitForResult('call-4', 'tool', {}, 5000);

			manager.resolve('call-1', undefined);
			manager.resolve('call-2', null);
			manager.resolve('call-3', { complex: { nested: 'data' } });
			manager.resolve('call-4', [1, 2, 3]);

			await expect(promise1).resolves.toBeUndefined();
			await expect(promise2).resolves.toBeNull();
			await expect(promise3).resolves.toEqual({ complex: { nested: 'data' } });
			await expect(promise4).resolves.toEqual([1, 2, 3]);
		});

		it('should only resolve once (subsequent resolves return false)', async () => {
			const promise = manager.waitForResult('call-1', 'test-tool', {}, 5000);

			expect(manager.resolve('call-1', 'first')).toBe(true);
			expect(manager.resolve('call-1', 'second')).toBe(false);
			await promise;
		});
	});

	describe('reject', () => {
		it('should reject pending call with error', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			const error = new Error('Tool execution failed');

			manager.reject('call-1', error);

			await expect(resultPromise).rejects.toThrow('Tool execution failed');
		});

		it('should return true when call exists', async () => {
			const promise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			expect(manager.reject('call-1', new Error('test'))).toBe(true);
			// Must await/catch the rejection to avoid unhandled rejection
			await expect(promise).rejects.toThrow('test');
		});

		it('should return false when call does not exist', () => {
			expect(manager.reject('non-existent', new Error('test'))).toBe(false);
		});

		it('should remove call from pending after rejection', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 5000);
			manager.reject('call-1', new Error('test'));

			await expect(resultPromise).rejects.toThrow();
			expect(manager.has('call-1')).toBe(false);
		});
	});

	describe('cleanupBySessionId', () => {
		it('should resolve all calls matching session prefix with underscore', async () => {
			const promise1 = manager.waitForResult('session-1_msg-1', 'tool', {}, 5000);
			const promise2 = manager.waitForResult('session-1_msg-2', 'tool', {}, 5000);
			const promise3 = manager.waitForResult('session-2_msg-1', 'tool', {}, 5000);

			manager.cleanupBySessionId('session-1');

			await expect(promise1).resolves.toBeUndefined();
			await expect(promise2).resolves.toBeUndefined();

			expect(manager.has('session-1_msg-1')).toBe(false);
			expect(manager.has('session-1_msg-2')).toBe(false);
			expect(manager.has('session-2_msg-1')).toBe(true);

			manager.resolve('session-2_msg-1', 'result');
			await promise3;
		});

		it('should not cleanup calls without underscore separator', async () => {
			const promise = manager.waitForResult('session-1', 'tool', {}, 5000);

			manager.cleanupBySessionId('session-1');

			expect(manager.has('session-1')).toBe(true);

			manager.resolve('session-1', 'result');
			await promise;
		});

		it('should handle cleanup when no matching sessions', async () => {
			const promise = manager.waitForResult('other-session_msg-1', 'tool', {}, 5000);

			expect(() => manager.cleanupBySessionId('session-1')).not.toThrow();

			expect(manager.has('other-session_msg-1')).toBe(true);

			manager.resolve('other-session_msg-1', 'result');
			await promise;
		});

		it('should handle cleanup when no pending calls', () => {
			expect(() => manager.cleanupBySessionId('session-1')).not.toThrow();
		});
	});

	describe('get and has', () => {
		it('should return call info for existing call', async () => {
			const promise = manager.waitForResult('call-1', 'test-tool', { arg: 'value' }, 5000);
			const info = manager.get('call-1');

			expect(info).toBeDefined();
			expect(info).toHaveProperty('resolve');
			expect(info).toHaveProperty('reject');
			expect(info).toHaveProperty('toolName', 'test-tool');
			expect(info).toHaveProperty('arguments', { arg: 'value' });

			manager.resolve('call-1', 'result');
			await promise;
		});

		it('should return undefined for non-existent call', () => {
			expect(manager.get('non-existent')).toBeUndefined();
		});

		it('should return true for existing call', async () => {
			const promise = manager.waitForResult('call-1', 'tool', {}, 5000);
			expect(manager.has('call-1')).toBe(true);
			manager.resolve('call-1', 'result');
			await promise;
		});

		it('should return false for non-existent call', () => {
			expect(manager.has('non-existent')).toBe(false);
		});
	});

	describe('remove', () => {
		it('should remove pending call without resolving or rejecting', async () => {
			const promise = manager.waitForResult('call-1', 'tool', {}, 5000);

			manager.remove('call-1');

			expect(manager.has('call-1')).toBe(false);
			// Note: The promise will never resolve/reject when removed this way
			// This is expected behavior - remove() is for cleanup when we don't care about the result
			// We need to avoid the unhandled rejection by advancing time to trigger timeout
			// but the promise was removed so it won't reject. We handle this by catching any potential rejection
			await Promise.race([promise.catch(() => {}), Promise.resolve()]);
		});

		it('should handle removing non-existent call', () => {
			expect(() => manager.remove('non-existent')).not.toThrow();
>>>>>>> upstream/master
		});
	});
});
