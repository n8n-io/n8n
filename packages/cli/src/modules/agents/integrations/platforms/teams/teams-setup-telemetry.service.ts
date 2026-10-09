import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { UserError } from 'n8n-workflow';

import { Telemetry } from '@/telemetry';

type Step = 'create_app' | 'create_bot' | 'install';

export interface TeamsSetupStepReport {
	agentId: string;
	projectId: string;
	userId: string;
	step: Step;
	/** `manual` is the rung taken when the account reaches no subscription. */
	botRoute?: 'provisioned' | 'manual';
	installRoute?: 'upload';
}

/**
 * The walls the setup runs into, named at the point they are hit rather than
 * recognised from the message afterwards. A message is never reported:
 * Microsoft puts tenant and account detail in them, and matching on it couples
 * the taxonomy to copy that gets reworded.
 */
export type TeamsSetupFailure =
	| 'cannot_register_apps'
	| 'personal_account'
	| 'secrets_refused'
	| 'no_contributor_role'
	| 'provider_registering'
	| 'endpoint_not_https'
	| 'teams_channel_failed'
	| 'not_signed_in';

const FAILURE_TAG = 'teamsSetupFailure';

/** Tags an error with the wall it represents, for `reasonFor` to read back. */
export function withTeamsFailure<E extends Error>(error: E, reason: TeamsSetupFailure): E {
	// Writable, so an error that reaches a second tagging site is re-tagged
	// rather than throwing on the way out.
	Object.defineProperty(error, FAILURE_TAG, {
		value: reason,
		enumerable: false,
		writable: true,
		configurable: true,
	});
	return error;
}

/**
 * Records how far the recommended Teams setup got, and where it stopped.
 *
 * The bot ladder exists because n8n can only create the bot when the tenant has
 * an Azure subscription, and a Microsoft 365 tenant does not come with one.
 * Which rung people land on is the question this answers.
 */
@Service()
export class TeamsSetupTelemetryService {
	constructor(private readonly telemetry: Telemetry) {}

	succeeded(report: TeamsSetupStepReport): void {
		this.track(report, 'succeeded');
	}

	failed(report: TeamsSetupStepReport, error: unknown): void {
		this.track(report, 'failed', reasonFor(error));
	}

	/** Telemetry must never turn a working step into a failed request. */
	private track(
		report: TeamsSetupStepReport,
		outcome: 'succeeded' | 'failed',
		reason?: string,
	): void {
		try {
			this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_TEAMS_SETUP_STEP, {
				agent_id: report.agentId,
				project_id: report.projectId,
				user_id: report.userId,
				step: report.step,
				outcome,
				...(report.botRoute ? { bot_route: report.botRoute } : {}),
				...(report.installRoute ? { install_route: report.installRoute } : {}),
				...(reason ? { reason } : {}),
			});
		} catch {
			// Reporting a step must not fail the step.
		}
	}
}

function reasonFor(error: unknown): string {
	if (!(error instanceof Error)) return 'unknown';
	const tagged = (error as unknown as Record<string, unknown>)[FAILURE_TAG];
	if (typeof tagged === 'string') return tagged;
	// A UserError is something the user can act on, so the distinction is worth
	// keeping even when the specific wall has no name of its own yet.
	return error instanceof UserError ? 'refused' : 'unknown';
}
