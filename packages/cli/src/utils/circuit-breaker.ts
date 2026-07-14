import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { SlidingWindow } from './sliding-window';

type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Error thrown when a circuit breaker is open and rejects requests.
 *
 * This error indicates that the circuit breaker has detected too many failures
 * and is preventing requests from being executed to protect the downstream service.
 */
export class CircuitBreakerOpen extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'CircuitBreakerOpen';
	}
}

/**
 * Options to configure a circuit breaker instance.
 */
export interface CircuitBreakerOptions {
	/**
	 * Time in milliseconds to wait before transitioning from OPEN to HALF_OPEN state.
	 * After this duration, the circuit will attempt to test if the service has recovered.
	 * Recommended: 2-10 seconds depending on service recovery characteristics.
	 */
	timeout: number;

	/**
	 * Maximum number of failures within the sliding window before the circuit opens.
	 * Once this threshold is exceeded, the circuit transitions to OPEN state and rejects all requests.
	 * Recommended: 3-10 failures depending on acceptable failure rate.
	 */
	maxFailures: number;

	/**
	 * Number of consecutive successful requests required in HALF_OPEN state
	 * before transitioning back to CLOSED. This ensures the service is stable before fully recovering.
	 * Recommended: 1-3 requests to verify recovery without delay.
	 */
	halfOpenRequests: number;

	/**
	 * Time window in milliseconds for counting failures (sliding window).
	 * Only failures within this window are counted toward the threshold. Older failures expire naturally.
	 * Recommended: 2-5x the timeout duration to capture relevant failure patterns.
	 */
	failureWindow: number;

	/**
	 * Maximum number of requests allowed to execute concurrently
	 * in HALF_OPEN state. Prevents overwhelming a recovering service with queued requests.
	 * Default: 1 (recommended for most use cases).
	 */
	maxConcurrentHalfOpenRequests?: number;
}

/**
 * Implementation of the Circuit Breaker pattern for fault tolerance.
 *
 * A circuit breaker protects services from cascading failures by monitoring
 * request failures and temporarily blocking requests when failure rates are high.
 * This gives failing services time to recover without being overwhelmed by traffic.
 *
 * ## States
 *
 * The circuit breaker operates in three states:
 *
 * - **CLOSED**: Normal operation. Requests are executed. Failures are tracked
 *   in a sliding time window. If failure count exceeds the threshold within
 *   the window, the circuit transitions to OPEN.
 *
 * - **OPEN**: Failure state. All requests are immediately rejected with
 *   CircuitBreakerOpen error without executing the function. After a timeout
 *   period, the circuit transitions to HALF_OPEN to test recovery.
 *
 * - **HALF_OPEN**: Recovery testing. A limited number of requests are allowed
 *   through to test if the service has recovered. If enough consecutive requests
 *   succeed, the circuit transitions back to CLOSED. If any request fails,
 *   the circuit immediately returns to OPEN.
 *
 * ## Sliding Window
 *
 * Failures are tracked in a time-based sliding window. Only failures within
 * the configured window duration are counted. This prevents old failures from
 * affecting current circuit state and allows natural recovery as failures age out.
 *
 * ## Concurrency Control
 *
 * In HALF_OPEN state, only a limited number of concurrent requests are allowed
 * to prevent overwhelming a recovering service with a "thundering herd" of
 * queued requests.
 *
 * @example
 * ```typescript
 * // Create a circuit breaker for webhook calls
 * const breaker = new CircuitBreaker(
 *   5000,   // timeout: Wait 5 seconds before testing recovery
 *   5,      // maxFailures: Open circuit after 5 failures
 *   2,      // halfOpenRequests: Need 2 successes to close circuit
 *   10000,  // failureWindow: Count failures within 10 second window
 * );
 *
 * // Use the circuit breaker
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await fetch('https://webhook.example.com/endpoint');
 *   });
 *   console.log('Success:', result);
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpen) {
 *     console.log('Circuit is open, request blocked');
 *   } else {
 *     console.log('Request failed:', error);
 *   }
 * }
 *
 * // Check current state
 * console.log(breaker.currentState()); // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
 * ```
 */
export class CircuitBreaker {
	private state: CircuitBreakerState;
	private halfOpenCount: number;
	private lastFailureTime: number;
	private logger: Logger;

	private pendingHalfOpenRequests = 0;
	private inflightRequests = 0;

	private slidingWindow: SlidingWindow;

	private readonly timeoutMs: number;
	private readonly maxFailures: number;
	private readonly halfOpenRequests: number;
	private readonly failureWindowMs: number;
	private readonly maxConcurrentHalfOpenRequests: number;

	/**
	 * Creates a new circuit breaker instance.
	 *
	 * @param options - Configuration options for the circuit breaker.
	 */
	constructor(options: CircuitBreakerOptions) {
		this.state = 'CLOSED';
		this.lastFailureTime = 0;
		this.halfOpenCount = 0;

		this.timeoutMs = options.timeout;
		this.maxFailures = options.maxFailures;
		this.halfOpenRequests = options.halfOpenRequests;
		this.failureWindowMs = options.failureWindow;
		this.maxConcurrentHalfOpenRequests = options.maxConcurrentHalfOpenRequests ?? 1;

		this.slidingWindow = new SlidingWindow({
			durationMs: this.failureWindowMs,
			maxEvents: this.maxFailures,
		});

		this.logger = Container.get(Logger).scoped('circuit-breaker');
	}

	/**
	 * Returns the current state of the circuit breaker.
	 *
	 * @returns The current state: 'CLOSED' (normal operation), 'OPEN' (rejecting requests),
	 *   or 'HALF_OPEN' (testing recovery).
	 */
	currentState(): CircuitBreakerState {
		return this.state;
	}

	private getFailureCount(): number {
		return this.slidingWindow.getCount();
	}

	private clearFailures() {
		this.slidingWindow.clear();
	}

	private recordFailure() {
		const now = Date.now();
		this.lastFailureTime = now;

		this.slidingWindow.addEvent(now);
	}

	private changeToState(newState: CircuitBreakerState) {
		if (newState === this.state) return;
		this.logger.debug(`Circuit breaker changing state from ${this.state} to ${newState}`);
		this.state = newState;
	}

	private async handleOpenState<T>(fn: () => Promise<T>): Promise<T> {
		if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
			this.halfOpenCount = 0;
			this.changeToState('HALF_OPEN');
			return await this.handleHalfOpenState(fn);
		}
		throw new CircuitBreakerOpen();
	}

	private async handleHalfOpenState<T>(fn: () => Promise<T>): Promise<T> {
		if (this.pendingHalfOpenRequests >= this.maxConcurrentHalfOpenRequests) {
			throw new CircuitBreakerOpen(
				'Circuit breaker is half-open and testing requests, this request is rejected',
			);
		}

		this.pendingHalfOpenRequests++;

		try {
			const result = await fn();
			this.halfOpenCount++;
			// Only after halfOpenRequests successful requests, we transition to CLOSED
			if (this.halfOpenCount >= this.halfOpenRequests) {
				this.changeToState('CLOSED');
				this.clearFailures();
			}
			return result;
		} catch (error) {
			// if an error occurs in the half open state, we immediately transition to OPEN
			this.recordFailure();
			this.changeToState('OPEN');
			throw error;
		} finally {
			this.pendingHalfOpenRequests--;
		}
	}

	private async handleClosedState<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			this.recordFailure();
			if (this.getFailureCount() >= this.maxFailures) {
				this.changeToState('OPEN');
			}
			throw error;
		}
	}

	/**
	 * Executes a function with circuit breaker protection.
	 *
	 * The function is executed based on the current circuit state:
	 * - **CLOSED**: Function executes normally. Failures are tracked.
	 * - **OPEN**: Function is not executed. Throws CircuitBreakerOpen immediately.
	 * - **HALF_OPEN**: Function executes if concurrency limit allows. Success/failure
	 *   determines if circuit closes or reopens.
	 *
	 * @template T - The return type of the function being executed
	 * @param fn - Async function to execute with circuit breaker protection
	 * @returns A promise that resolves to the function's return value
	 * @throws {CircuitBreakerOpen} When the circuit is open or half-open with max concurrent requests
	 * @throws {Error} Any error thrown by the executed function
	 *
	 * @example
	 * ```typescript
	 * const result = await breaker.execute(async () => {
	 *   const response = await fetch('https://api.example.com/data');
	 *   return response.json();
	 * });
	 * ```
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		const wrapper = async () => {
			this.inflightRequests++;
			this.logger.debug(
				`Executing function with circuit breaker protection, inflight requests: ${this.inflightRequests}`,
			);
			try {
				return await fn();
			} finally {
				this.inflightRequests--;
				this.logger.debug(
					`Executed function with circuit breaker protection, inflight requests: ${this.inflightRequests}`,
				);
			}
		};
		switch (this.state) {
			case 'OPEN':
				return await this.handleOpenState(wrapper);
			case 'HALF_OPEN':
				return await this.handleHalfOpenState(wrapper);
			case 'CLOSED':
				return await this.handleClosedState(wrapper);
		}
	}
}
