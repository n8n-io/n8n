import { UNLIMITED_CREDITS } from '@n8n/api-types';

type Credits = { creditsQuota: number; creditsClaimed: number; quotaLocked?: boolean };

type ThreadCredits = { threadId: string; totalCreditsUsed: number };

/**
 * Project a credit balance for the client.
 *
 * The activation-capped trial cohort must never see a balance — not before the lock and not after
 * it. Reporting the unlimited sentinel is what achieves that, and it needs no frontend change: the
 * editor already hides the credits dropdown and the per-thread usage line when the quota is
 * `UNLIMITED_CREDITS`.
 *
 * `quotaLocked` survives the masking because it carries no figure, only the fact that the pool is
 * spent. The editor needs it to warn the user *before* they type — otherwise the first they hear of
 * it is a message that fails.
 *
 * Only the numbers are masked. The ledger, the enforcement and the telemetry all keep running on
 * the real figures.
 */
export function maskCreditsForDisplay(
	credits: Credits,
	activationCapped: boolean,
	creditsPerThread?: ThreadCredits,
): Credits & { creditsPerThread?: ThreadCredits } {
	if (activationCapped) {
		return {
			creditsQuota: UNLIMITED_CREDITS,
			creditsClaimed: 0,
			quotaLocked: credits.quotaLocked ?? false,
		};
	}

	return { ...credits, ...(creditsPerThread ? { creditsPerThread } : {}) };
}
