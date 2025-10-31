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
			const breaker = new CircuitBreaker(1000, 3);

			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('CLOSED state behavior', () => {
		it('should execute function successfully when in CLOSED state', async () => {
			const breaker = new CircuitBreaker(1000, 3);
			const mockFn = jest.fn().mockResolvedValue('success');

			const result = await breaker.execute(mockFn);

			expect(result).toBe('success');
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should remain CLOSED after failures below threshold', async () => {
			const breaker = new CircuitBreaker(1000, 3);
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should transition to OPEN after reaching failure threshold', async () => {
			const breaker = new CircuitBreaker(1000, 3);
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');
		});
	});

	describe('OPEN state behavior', () => {
		it('should throw CircuitBreakerOpen when in OPEN state', async () => {
			const breaker = new CircuitBreaker(1000, 2);
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
			const breaker = new CircuitBreaker(timeout, 2);
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Trigger circuit breaker to open
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Advance time past timeout
			jest.advanceTimersByTime(timeout);

			// Next execution should transition to HALF_OPEN
			mockFn.mockResolvedValue('success');
			const result = await breaker.execute(mockFn);

			expect(result).toBe('success');
			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('HALF_OPEN state behavior', () => {
		it('should transition to CLOSED on successful execution in HALF_OPEN', async () => {
			const breaker = new CircuitBreaker(1000, 2);
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Open the circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Wait for timeout to transition to HALF_OPEN
			jest.advanceTimersByTime(1000);

			// Successful execution should close circuit and reset failure count
			mockFn.mockResolvedValue('success');
			const result = await breaker.execute(mockFn);

			expect(result).toBe('success');
			expect(breaker.currentState()).toBe('CLOSED');
		});

		it('should transition to OPEN on failure in HALF_OPEN when threshold is reached', async () => {
			const breaker = new CircuitBreaker(1000, 2);
			const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

			// Open the circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait for timeout to transition to HALF_OPEN
			jest.advanceTimersByTime(1000);

			// Failure in HALF_OPEN should reopen circuit
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');
		});
	});

	describe('failure count and recovery', () => {
		it('should reset failure count after successful HALF_OPEN execution', async () => {
			const breaker = new CircuitBreaker(1000, 2);
			const mockFn = jest.fn();

			// Cause one failure
			mockFn.mockRejectedValueOnce(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			// Open circuit with second failure
			mockFn.mockRejectedValueOnce(new Error('test error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('test error');

			expect(breaker.currentState()).toBe('OPEN');

			// Wait and recover
			jest.advanceTimersByTime(1000);
			mockFn.mockResolvedValue('success');
			await breaker.execute(mockFn);

			expect(breaker.currentState()).toBe('CLOSED');

			// Should be able to handle new failures without immediately opening
			mockFn.mockRejectedValueOnce(new Error('new error'));
			await expect(breaker.execute(mockFn)).rejects.toThrow('new error');

			expect(breaker.currentState()).toBe('CLOSED');
		});
	});

	describe('CircuitBreakerOpen error', () => {
		it('should create error with correct name', () => {
			const error = new CircuitBreakerOpen('Circuit is open');

			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe('CircuitBreakerOpen');
			expect(error.message).toBe('Circuit is open');
		});

		it('should create error without message', () => {
			const error = new CircuitBreakerOpen();

			expect(error.name).toBe('CircuitBreakerOpen');
			expect(error.message).toBe('');
		});
	});
});
