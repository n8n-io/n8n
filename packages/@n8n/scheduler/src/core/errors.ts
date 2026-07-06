/**
 * Raised when a schedule fails validation (bad cron expression, non-positive
 * interval, invalid one-off instant, unresolved timezone, unknown kind).
 *
 * A domain-specific error rather than n8n's `UserError`: it keeps schedule
 * failures identifiable on their own and the package decoupled from the n8n
 * error hierarchy.
 */
export class InvalidScheduleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidScheduleError';
	}
}

/**
 * Raised when a retention pass is invoked with unusable options (e.g. a
 * non-positive batch size), before any delete statement is issued.
 */
export class InvalidRetentionOptionsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidRetentionOptionsError';
	}
}

/**
 * Raised when a second `TaskHandler` is registered for a task type that
 * already has one: a wiring bug at the callsite, caught at registration so
 * the losing handler doesn't silently shadow the other.
 */
export class DuplicateTaskHandlerError extends Error {
	constructor(taskType: string) {
		super(`A handler for task type '${taskType}' is already registered`);
		this.name = 'DuplicateTaskHandlerError';
	}
}

/**
 * Raised when a stored row is missing a column its `kind`/type guarantees
 * should be set (a corrupt or hand-edited row), while mapping DB entities to
 * the scheduler's domain types.
 */
export class CorruptStorageRowError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CorruptStorageRowError';
	}
}
