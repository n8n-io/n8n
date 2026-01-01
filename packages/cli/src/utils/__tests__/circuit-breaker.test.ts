import { CircuitBreaker, CircuitBreakerOpen } from '../circuit-breaker';

describe('CircuitBreaker', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('initialization', () => {
		it('should start in CLOSED state', () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});

			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('CLOSED state behavior', () => {
		it('should execute function successfully when in CLOSED state', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockResolvedValue('success');

			const result = await breaker.execute(mockFn);

			expect(result).toBe('success');
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should remain CLOSED after failures below threshold', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should transition to OPEN after reaching failure threshold', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');
		});
	});

	describe('OPEN state behavior', () => {
		it('should throw CircuitBreakerOpen when in OPEN state', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Trigger circuit breaker to open
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Should throw CircuitBreakerOpen without executing function
			await expect(breaker.execute(mockFn)).rejects.toThrow(CircuitBreakerOpen);
			expect(mockFn).toHaveBeenCalledTimes(2); // Not called again
		});

		it('should transition to HALF_OPEN after timeout', async () => {
			const timeout = 5000;
			const breaker = new CircuitBreaker({
				timeout,
				maxFailures: 2,
				halfOpenRequests: 1,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Trigger circuit breaker to open
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Advance time past timeout
			jest.advanceTimersByTime(timeout);

			// Next execution should transition to HALF_OPEN and then CLOSED after success
			mockFn.mockResolvedValue('success');
			const result = await breaker.execute(mockFn);

			expect(result).toBe('success');
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should not transition to HALF_OPEN before timeout expires', async () => {
			const timeout = 5000;
			const breaker = new CircuitBreaker({
				timeout,
				maxFailures: 2,
				halfOpenRequests: 1,
				failureWindow: 10000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Open the circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Advance time but not past timeout
			jest.advanceTimersByTime(timeout - 1000);

			// Should still throw CircuitBreakerOpen
			await expect(breaker.execute(mockFn)).rejects.toThrow(CircuitBreakerOpen);
			expect(breaker.currentState()).toBe('OPEN');
		});
	});

	describe('HALF_OPEN state behavior', () => {
		it('should transition to CLOSED after required successful requests', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Open the circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait for timeout to transition to HALF_OPEN
			jest.advanceTimersByTime(1000);

			// First success - should stay HALF_OPEN
			mockFn.mockResolvedValue('success');
			await breaker.execute(mockFn);
			expect(breaker.currentState()).toBe('HALF_OPEN');

			// Second success - should transition to CLOSED
			await breaker.execute(mockFn);
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should transition immediately to OPEN on any failure in HALF_OPEN', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Open the circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait for timeout to transition to HALF_OPEN
			jest.advanceTimersByTime(1000);

			// Failure in HALF_OPEN should immediately reopen circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');
		});

		it('should reject additional concurrent requests in HALF_OPEN state', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn();

			// Open the circuit
			mockFn.mockRejectedValue(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait for timeout
			jest.advanceTimersByTime(1000);

			// Create a long-running request
			mockFn.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve('success'), 1000)),
			);

			// Start first request (should be allowed)
			const firstRequest = breaker.execute(mockFn);

			// Try to start second request while first is pending (should be rejected)
			await expect(breaker.execute(mockFn)).rejects.toThrow(CircuitBreakerOpen);
			await expect(breaker.execute(mockFn)).rejects.toThrow(CircuitBreakerOpen);

			// Complete the first request
			jest.advanceTimersByTime(1000);
			await firstRequest;

			// Now another request should be allowed
			mockFn.mockResolvedValue('success');
			await expect(breaker.execute(mockFn)).resolves.toBe('success');
		});

		it('should reset failure count after successful recovery', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 1,
				failureWindow: 5000,
			});
			const mockFn = jest.fn();

			// Open circuit
			mockFn.mockRejectedValue(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait and recover
			jest.advanceTimersByTime(1000);
			mockFn.mockResolvedValue('success');
			await breaker.execute(mockFn);

			expect(breaker.currentState()).toBe('CLOSED');

			// Should be able to handle new failures without immediately opening
			// (failure count was reset)
			mockFn.mockRejectedValueOnce(new Error('new error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('new error');

			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('sliding window behavior', () => {
		it('should only count failures within the time window', async () => {
			const breaker = new CircuitBreaker({
				timeout: 5000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 10000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// First failure at t=0
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			expect(breaker.currentState()).toBe('CLOSED');

			// Second failure at t=0
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			expect(breaker.currentState()).toBe('CLOSED');

			// Advance time to t=11000 (past the 10s window)
			jest.advanceTimersByTime(11000);

			// Third failure at t=11000 - should NOT open circuit because first two failures
			// are outside the window now
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should open circuit when failures occur within the window', async () => {
			const breaker = new CircuitBreaker({
				timeout: 5000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 10000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// First failure at t=0
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Second failure at t=2000
			jest.advanceTimersByTime(2000);
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Third failure at t=4000 (all within 10s window)
			jest.advanceTimersByTime(2000);
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');
		});

		it('should handle intermittent failures gracefully', async () => {
			const breaker = new CircuitBreaker({
				timeout: 5000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn();

			// Failure at t=0
			mockFn.mockRejectedValueOnce(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Advance time past window (6 seconds)
			jest.advanceTimersByTime(6000);

			// Another failure at t=6000 - first failure expired from window
			mockFn.mockRejectedValueOnce(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			expect(breaker.currentState()).toBe('CLOSED');

			// Advance time past window again
			jest.advanceTimersByTime(6000);

			// Another failure at t=12000 - second failure expired from window
			mockFn.mockRejectedValueOnce(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Should still be CLOSED because failures are spaced out
			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('edge cases', () => {
		it('should handle successful execution after circuit opens', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 2,
				halfOpenRequests: 1,
				failureWindow: 5000,
			});
			const mockFn = jest.fn();

			// Open circuit
			mockFn.mockRejectedValue(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait for timeout
			jest.advanceTimersByTime(1000);

			// Success should close circuit and clear failure window
			mockFn.mockResolvedValue('success');
			await breaker.execute(mockFn);

			expect(breaker.currentState()).toBe('CLOSED');

			// New failures should start fresh count
			mockFn.mockRejectedValueOnce(new Error('error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('error');
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should handle rapid failures at window boundary', async () => {
			const breaker = new CircuitBreaker({
				timeout: 5000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Two failures at t=0
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Advance to exactly the window boundary
			jest.advanceTimersByTime(5000);

			// One more failure at t=5000 - failures at t=0 are still within window
			// (window is [0, 5000], so failures at t=0 are included with >= comparison)
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Circuit should be OPEN (3 failures within window)
			expect(breaker.currentState()).toBe('OPEN');
		});

		it('should handle function that throws synchronously', async () => {
			const breaker = new CircuitBreaker({
				timeout: 1000,
				maxFailures: 3,
				halfOpenRequests: 2,
				failureWindow: 5000,
			});
			const mockFn = jest.fn(() => {
				throw new Error('sync error');
			});

			await expect(breaker.execute(mockFn as any)).rejects.toThrow('sync error');
			expect(breaker.currentState()).toBe('CLOSED');
		});
	});
});
