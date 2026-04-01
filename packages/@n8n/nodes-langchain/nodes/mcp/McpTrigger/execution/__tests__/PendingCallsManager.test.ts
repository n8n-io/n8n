import { PendingCallsManager } from '../PendingCallsManager';

describe('PendingCallsManager', () => {
	let manager: PendingCallsManager;

	beforeEach(() => {
		manager = new PendingCallsManager();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('waitForResult', () => {
		it('should resolve when result is provided via resolve()', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 5000);

			manager.resolve('call-1', { success: true });

			await expect(resultPromise).resolves.toEqual({ success: true });
		});

		it('should reject on timeout with meaningful error', async () => {
			const resultPromise = manager.waitForResult('call-1', 'test-tool', {}, 1000);

			jest.advanceTimersByTime(1001);

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

			jest.advanceTimersByTime(1001);

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
		});
	});
});
