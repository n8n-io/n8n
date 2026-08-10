import { UNLIMITED_CREDITS } from '@n8n/api-types';

type Credits = { creditsQuota: number; creditsClaimed: number };

type ThreadCredits = { threadId: string; totalCreditsUsed: number };

/**
 * Project a credit balance for the client.
 *
 * The activation-capped trial cohort must never see a balance — not before the lock and
 * not after it. Reporting the unlimited sentinel is what achieves that, and it needs no frontend
 * change: the editor already hides the credits dropdown, the warning banner and the per-thread
 * usage line when the quota is `UNLIMITED_CREDITS`. Once the pool is locked the user still gets the
 * standard out-of-credits wall, because that is driven by the `quota_exhausted` error code rather
 * than by any number shown here.
 *
 * Only the projection is masked. The ledger, the enforcement and the telemetry all keep running on
 * the real figures.
 */
export function maskCreditsForDisplay(
	credits: Credits,
	activationCapped: boolean,
	creditsPerThread?: ThreadCredits,
): Credits & { creditsPerThread?: ThreadCredits } {
	if (activationCapped) {
		return { creditsQuota: UNLIMITED_CREDITS, creditsClaimed: 0 };
	}

	return { ...credits, ...(creditsPerThread ? { creditsPerThread } : {}) };
}
