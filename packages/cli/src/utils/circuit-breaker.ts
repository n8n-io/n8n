type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerOpen extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'CircuitBreakerOpen';
	}
}

export class CircuitBreaker {
	private state: CircuitBreakerState;
	private failureCount: number;
	private lastFailureTime: number;

	constructor(
		// Timeout in milliseconds before transitioning from OPEN to HALF_OPEN
		private readonly timeout: number,
		// Maximum number of failures before transitioning from CLOSED to OPEN
		private readonly maxFailures: number,
	) {
		this.state = 'CLOSED';
		this.failureCount = 0;
		this.lastFailureTime = 0;
	}

	currentState(): CircuitBreakerState {
		return this.state;
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime >= this.timeout) {
				this.state = 'HALF_OPEN';
			}
		}
		switch (this.state) {
			case 'CLOSED':
				try {
					return await fn();
				} catch (error) {
					this.failureCount++;
					this.lastFailureTime = Date.now();
					if (this.failureCount >= this.maxFailures) {
						this.state = 'OPEN';
					}
					throw error;
				}
			case 'OPEN':
				throw new CircuitBreakerOpen();
			case 'HALF_OPEN':
				try {
					const result = await fn();
					this.state = 'CLOSED';
					this.failureCount = 0;
					return result;
				} catch (error) {
					this.failureCount++;
					this.lastFailureTime = Date.now();
					if (this.failureCount >= this.maxFailures) {
						this.state = 'OPEN';
					}
					throw error;
				}
		}
	}
}
