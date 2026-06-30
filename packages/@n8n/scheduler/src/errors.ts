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
