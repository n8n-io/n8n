export class SleepRequestedError extends Error {
	constructor(
		public readonly sleepMs: number,
		public readonly intermediateState?: unknown,
	) {
		super(`Sleep requested: ${sleepMs}ms`);
		this.name = 'SleepRequestedError';
	}
}

export class WaitUntilRequestedError extends Error {
	constructor(
		public readonly date: Date,
		public readonly intermediateState?: unknown,
	) {
		super(`WaitUntil requested: ${date.toISOString()}`);
		this.name = 'WaitUntilRequestedError';
	}
}

export class NonRetriableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NonRetriableError';
	}
}
