import { DuplicateTaskHandlerError } from '../errors';
import type { ClaimedTask } from '../types';

// Module-private tokens: a `DispatchDecision` can only be minted here, by the
// reporter the executor hands to `execute`. That makes the type unforgeable
// outside this module, so the only way a handler can produce the value it must
// return is to call one of the reporter's methods.
const DISPATCHED = Symbol('dispatched');
const NOT_DISPATCHED = Symbol('not-dispatched');

/**
 * Opaque proof that a handler decided whether its effect was dispatched.
 * Obtainable only from the {@link DispatchReporter} the executor passes to
 * `execute`, so a handler cannot return from `execute` without deciding.
 */
export type DispatchDecision = typeof DISPATCHED | typeof NOT_DISPATCHED;

/**
 * How a handler reports its dispatch decision. The executor passes one to every
 * `execute` call and the handler must return the result of exactly one method.
 */
export interface DispatchReporter {
	/**
	 * The effect has been handed off, so from this point the occurrence must not be
	 * retried even if the rest of `execute` throws. Call it the instant that becomes
	 * true — typically once re-running would duplicate the effect (e.g. the workflow
	 * execution was created and started). It stamps the dispatch marker immediately,
	 * so a throw *after* this point leaves the occurrence recorded as dispatched
	 * rather than being retried. A second call is a no-op.
	 */
	dispatched(): DispatchDecision;
	/**
	 * No effect has been handed off yet, so a throw *after* this point is still safe
	 * to retry (e.g. a redelivery that found the effect already exists, or nothing to
	 * do so far). No marker is written. Note the executor still treats a clean return
	 * as done: this only affects what happens if the handler subsequently throws.
	 */
	notDispatched(): DispatchDecision;
}

/**
 * Builds the reporter the executor hands to a handler. `onDispatch` runs the
 * first time {@link DispatchReporter.dispatched} is called (it stamps the marker
 * and is itself idempotent); {@link DispatchReporter.notDispatched} records
 * nothing. The returned token exists only to force the handler to state a decision
 * at compile time — the executor keys its runtime behavior off the `onDispatch`
 * side effect, not the returned value, and stamps the marker itself when a handler
 * returns without having dispatched.
 */
export function createDispatchReporter(onDispatch: () => void): DispatchReporter {
	return {
		dispatched() {
			onDispatch();
			return DISPATCHED;
		},
		notDispatched() {
			return NOT_DISPATCHED;
		},
	};
}

/**
 * Runs one claimed task. Registered against a `taskType`; the executor resolves
 * the handler for a task's type and calls `execute`. A throw means the attempt
 * failed (the executor retries with backoff or marks the task failed).
 *
 * A clean return always completes the occurrence — the executor never redelivers
 * a handler that returned without throwing. `execute` must end by returning a
 * {@link DispatchReporter} decision; that decision only governs what happens if the
 * handler *throws*:
 *   - `report.dispatched()` once the effect has been handed off, so a throw after
 *     this point must not retry (a re-run would duplicate it, e.g. the workflow
 *     execution was created and started). The executor stamps the dispatch marker,
 *     which stops the reaper from retrying the occurrence or recording it as failed.
 *   - `report.notDispatched()` while no effect has been handed off yet, so a throw
 *     after this point is still safe to retry — a redelivery that found the effect
 *     already exists, or nothing done so far.
 *
 * A handler may run up to the task's `timeoutSeconds`: the executor renews the
 * claim's lease while `execute` is pending. `run.signal` aborts with a `LeaseLostError` when the
 * claim is gone, or no renewal succeeded for a whole lease, and no dispatch
 * marker is stored, so another instance may run the same occurrence. Honoring
 * it is optional, but a handler that ignores it may overlap that run. Once
 * `report.dispatched()` has stored the marker, the signal never aborts for a
 * lost claim: no instance runs that occurrence again.
 *
 * At the timeout, `run.signal` aborts with a `TaskTimeoutError` and the lease is no
 * longer renewed, whether or not the handler dispatched. A run that did not
 * dispatch counts as a failed attempt. A run that dispatched completes. A
 * handler that returns cleanly after the abort still completes the occurrence.
 */
export interface TaskHandler {
	execute(task: ClaimedTask, report: DispatchReporter, run: TaskRun): Promise<DispatchDecision>;
}

/** The lifetime of one handler run. */
export interface TaskRun {
	/** Aborts with a `LeaseLostError` or a `TaskTimeoutError`. */
	readonly signal: AbortSignal;
	/** Milliseconds until the timeout aborts `signal`. 0 once it did. */
	remainingMs(): number;
}

/** How a holder tells the executor its resource is armed. */
export interface HoldReporter {
	/**
	 * The resource is armed. Stamps `heldSince` and resets the attempt count, so a
	 * later loss of the task costs no attempt. Call it once the resource works. A
	 * second call is a no-op. When the claim is already gone, the run's signal aborts.
	 */
	ready(): Promise<void>;
}

/** The lifetime of one hold. */
export interface HoldRun {
	/**
	 * Aborts when the holder must let go: a `LeaseLostError` when the claim is gone or
	 * about to expire, a `TaskTimeoutError` when `ready()` did not come in time, and a
	 * `HolderShutdownError` when the executor stops.
	 */
	readonly signal: AbortSignal;
}

/**
 * Keeps one held task for as long as the work runs. Registered against a `taskType`
 * like a {@link TaskHandler}, but runs tasks whose `mode` is `hold`.
 *
 * The handler arms its resource, calls `holder.ready()`, waits on `run.signal`,
 * disarms and returns. A clean return releases the task back to `pending` with no
 * attempt counted, so another instance, or this one, claims it again. A throw or a
 * return before `ready()` is a failed start: it counts an attempt and backs off. A
 * throw after `ready()` releases with a backoff and counts no attempt.
 *
 * Held tasks have no run timeout: the job's `timeoutSeconds` bounds only the time
 * from the claim to `ready()`.
 */
export interface HoldTaskHandler {
	readonly mode: 'hold';
	hold(task: ClaimedTask, holder: HoldReporter, run: HoldRun): Promise<void>;
}

export type AnyTaskHandler = TaskHandler | HoldTaskHandler;

export function isHoldTaskHandler(handler: AnyTaskHandler): handler is HoldTaskHandler {
	return 'mode' in handler && handler.mode === 'hold';
}

/**
 * Where handlers register themselves by `taskType`. The executor claims only the
 * types present here (`registeredTypes`), so an instance never picks up work it
 * has no handler for.
 */
export class TaskHandlerRegistry {
	private readonly handlers = new Map<string, AnyTaskHandler>();

	/** Register `handler` for `taskType`. Throws if one is already registered. */
	register(taskType: string, handler: AnyTaskHandler): void {
		if (this.handlers.has(taskType)) {
			throw new DuplicateTaskHandlerError(taskType);
		}
		this.handlers.set(taskType, handler);
	}

	resolve(taskType: string): AnyTaskHandler | undefined {
		return this.handlers.get(taskType);
	}

	/** The registered task types, used to scope the claim to runnable work. */
	registeredTypes(): string[] {
		return [...this.handlers.keys()];
	}
}
