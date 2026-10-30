import { UserError } from 'n8n-workflow';

/**
 * Substituted for a masked stream failure once the credit re-check confirms
 * the user is out of credits. Carries the machine-readable quota code so the
 * run is classified exactly like a quota error surfaced by the proxy (credits
 * message + structured `errorCode`, not reported to Sentry), and keeps the
 * masked original as `cause` for tracing and telemetry.
 */
export class QuotaExhaustedStreamError extends UserError {
	readonly errorCode = 'quota_exhausted';

	constructor(maskedError: Error) {
		super(`AI credits exhausted (${maskedError.name}: ${maskedError.message})`, {
			cause: maskedError,
		});
	}
}

/** True when the balance can no longer start another assistant run. */
export function isAssistantCreditBalanceExhausted(credits: {
	creditsQuota: number;
	creditsClaimed: number;
}): boolean {
	return credits.creditsQuota >= 0 && credits.creditsClaimed >= credits.creditsQuota;
}

export function assistantCreditsExhaustedError(): QuotaExhaustedStreamError {
	return new QuotaExhaustedStreamError(new Error('Assistant credits exhausted'));
}
