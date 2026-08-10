import { UNLIMITED_CREDITS } from '@n8n/api-types';

import { maskCreditsForDisplay } from '../instance-ai-credit-display';

describe('maskCreditsForDisplay', () => {
	const credits = { creditsQuota: 800, creditsClaimed: 12.5 };
	const perThread = { threadId: 't1', totalCreditsUsed: 3 };

	describe('outside the activation-capped cohort', () => {
		it('passes the balance through untouched', () => {
			expect(maskCreditsForDisplay(credits, false)).toEqual(credits);
		});

		it('keeps the per-thread total when one was computed', () => {
			expect(maskCreditsForDisplay(credits, false, perThread)).toEqual({
				...credits,
				creditsPerThread: perThread,
			});
		});

		it('omits the per-thread total when none was computed', () => {
			expect(maskCreditsForDisplay(credits, false)).not.toHaveProperty('creditsPerThread');
		});
	});

	describe('inside the activation-capped cohort', () => {
		it('reports the unlimited sentinel instead of the balance', () => {
			expect(maskCreditsForDisplay(credits, true)).toEqual({
				creditsQuota: UNLIMITED_CREDITS,
				creditsClaimed: 0,
			});
		});

		it('suppresses the per-thread total too', () => {
			expect(maskCreditsForDisplay(credits, true, perThread)).not.toHaveProperty(
				'creditsPerThread',
			);
		});

		it('still hides the balance once the quota is spent', () => {
			expect(maskCreditsForDisplay({ creditsQuota: 800, creditsClaimed: 800 }, true)).toEqual({
				creditsQuota: UNLIMITED_CREDITS,
				creditsClaimed: 0,
			});
		});
	});
});
