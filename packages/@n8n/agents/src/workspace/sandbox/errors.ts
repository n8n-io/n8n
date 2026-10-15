/**
 * Raised when a workspace sandbox could not be acquired — looked up, resumed, created, or
 * reattached — after bounded retries. Wraps the provider SDK error so callers can classify
 * acquisition failures without pattern-matching raw SDK error types.
 */
export class SandboxAcquisitionError extends Error {
	constructor(
		message: string,
		/** Coarse failure category (e.g. `DaytonaError:502`) for logging and error tracking. */
		readonly failureClass: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = new.target.name;
	}
}

/**
 * A create kept returning a name conflict while the conflicting sandbox stayed invisible to
 * this client (e.g. owned by another account in proxy mode). Progress is impossible, so this
 * is raised instead of retrying until the acquisition budget is exhausted.
 */
export class SandboxNameConflictError extends SandboxAcquisitionError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, 'unresolved-name-conflict', options);
	}
}

/**
 * An existing sandbox that carries workspace state did not reach 'started' within the
 * acquisition budget. The sandbox is kept — deleting it would lose the thread's files —
 * and the turn fails; a later attempt reattaches once the sandbox recovers.
 */
export class SandboxNotReadyError extends SandboxAcquisitionError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, 'sandbox-not-ready', options);
	}
}
