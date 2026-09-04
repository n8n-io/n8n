import type { PolicyViolation } from '@n8n/decorators';
import { UserError } from 'n8n-workflow';

/** `enforce*` only throws when something objected, so an empty list is a bug, not a case. */
export type NonEmptyViolations = [PolicyViolation, ...PolicyViolation[]];

/** Narrows a decision's violations to something `PolicyViolationError` will accept. */
export const hasViolations = (violations: PolicyViolation[]): violations is NonEmptyViolations =>
	violations.length > 0;

function summarize(violations: NonEmptyViolations): string {
	if (violations.length === 1) return violations[0].message;

	return `Blocked by policy: ${violations.map((v) => v.message).join('; ')}`;
}

/**
 * Thrown by every `enforce*` method when a policy blocks an action.
 *
 * `UserError` so the execution path treats a blocked run as non-retryable, plus the
 * `httpStatusCode`/`errorCode` pair `classifyHttpError` looks for so `meta` — and with it the
 * violations — reaches the REST body. Extending `ResponseError` would lose the first.
 */
export class PolicyViolationError extends UserError {
	readonly violations: PolicyViolation[];

	/** 403: the caller is authenticated and understood, policy forbids the action. */
	readonly httpStatusCode = 403;

	readonly errorCode = 403;

	readonly meta: { violations: PolicyViolation[] };

	/**
	 * An own property, so it survives the flattening that execution failure
	 * serialization does to errors — where `instanceof` no longer holds. Read it
	 * through {@link isPolicyRefusal}, never directly.
	 */
	readonly isPolicyRefusal = true;

	/**
	 * @param violations All of them, not just the first — a user fixing a workflow deserves the
	 * whole list.
	 * @param message Overrides the derived summary when the call site can say more.
	 */
	constructor(violations: NonEmptyViolations, message = summarize(violations)) {
		// `warning`, not `UserError`'s default `info`, matching 4xx `ResponseError`s.
		super(message, { level: 'warning' });

		// Copied: the error outlives the aggregation that produced the list.
		this.violations = [...violations];
		this.meta = { violations: this.violations };
	}
}

/**
 * Whether an error is a policy refusal, including one flattened into a plain
 * object by execution failure serialization, where `instanceof` no longer holds.
 *
 * The default way to ask. Use `instanceof` only where the typed instance itself
 * is needed, e.g. to read {@link PolicyViolationError.violations}.
 */
export function isPolicyRefusal(error: unknown): boolean {
	if (error instanceof PolicyViolationError) return true;

	// `hasOwn`, not `in`: the marker is an own property by contract, and an inherited
	// one would let an unrelated error suppress cleanup and retries.
	return (
		typeof error === 'object' &&
		error !== null &&
		Object.hasOwn(error, 'isPolicyRefusal') &&
		(error as { isPolicyRefusal?: unknown }).isPolicyRefusal === true
	);
}
