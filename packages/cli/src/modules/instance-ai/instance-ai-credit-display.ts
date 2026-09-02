import { UNLIMITED_CREDITS, type InstanceAiCredits } from '@n8n/api-types';

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
 * Absence is preserved rather than normalised to `false`. Not every caller has an opinion on the
 * lock: a claim reports a balance and knows nothing about it. Answering `false` on their behalf
 * would tell the editor the pool is open, retracting a warning the lock had already raised — and
 * claims can arrive after the lock, from a background memory task or a fire-and-forget HITL
 * segment. Only a caller that actually checked may speak.
 *
 * Only the numbers are masked. The ledger, the enforcement and the telemetry all keep running on
 * the real figures.
 */
export function maskCreditsForDisplay(
	credits: InstanceAiCredits,
	activationCapped: boolean,
	creditsPerThread?: ThreadCredits,
): InstanceAiCredits & { creditsPerThread?: ThreadCredits } {
	if (activationCapped) {
		return {
			creditsQuota: UNLIMITED_CREDITS,
			creditsClaimed: 0,
			...(credits.quotaLocked !== undefined ? { quotaLocked: credits.quotaLocked } : {}),
		};
	}

	return { ...credits, ...(creditsPerThread ? { creditsPerThread } : {}) };
}
