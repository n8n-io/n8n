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
 * Raised when a scheduler is composed with unusable lifecycle options
 * (e.g. a jitter ratio that would allow a zero or negative delay between ticks).
 */
export class InvalidLifecycleOptionsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidLifecycleOptionsError';
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
 * Raised when a stored row is missing a column its `kind` guarantees should be
 * set (a corrupt or hand-edited row), while assembling its `Schedule` from the
 * flat columns (see `resolveSchedule`).
 */
export class CorruptStorageRowError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CorruptStorageRowError';
	}
}

/**
 * Raised when an owner type is registered with an unusable name: empty, or
 * too long to store.
 */
export class InvalidOwnerTypeError extends Error {
	constructor(
		readonly ownerType: string,
		readonly maxLength: number,
	) {
		super('Scheduled job owner type must be non-empty and fit its length limit');
		this.name = 'InvalidOwnerTypeError';
	}
}

/**
 * Raised when a second resolver is registered for an owner type that already
 * has one: a wiring bug at the callsite, caught at registration so the losing
 * resolver doesn't silently shadow the other.
 */
export class DuplicateOwnerResolverError extends Error {
	constructor(readonly ownerType: string) {
		super('A resolver for this scheduled job owner type is already registered');
		this.name = 'DuplicateOwnerResolverError';
	}
}
