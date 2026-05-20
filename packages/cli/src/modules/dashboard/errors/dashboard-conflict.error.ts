import { UserError } from 'n8n-workflow';

/**
 * Thrown when an optimistic-concurrency check fails — the client sent an
 * `expectedVersion` that no longer matches the persisted dashboard.
 *
 * The current version is attached so the controller can surface it to the
 * client, who can reload and retry.
 */
export class DashboardConflictError extends UserError {
	constructor(public readonly currentVersion: number) {
		super(
			`Dashboard was modified by another change (current version ${currentVersion}). Reload and try again.`,
		);
	}
}
