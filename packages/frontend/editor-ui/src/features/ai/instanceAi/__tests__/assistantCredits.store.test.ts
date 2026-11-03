import { createPinia, setActivePinia } from 'pinia';

import { useAssistantCreditsStore } from '../assistantCredits.store';
import { getInstanceAiCredits } from '../instanceAi.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678/rest' } }),
}));

vi.mock('../instanceAi.api', () => ({
	getInstanceAiCredits: vi.fn(),
}));

describe('useAssistantCreditsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	describe('setCredits', () => {
		it('stores the quota and the claimed credits', () => {
			const store = useAssistantCreditsStore();

			store.setCredits({ creditsQuota: 100, creditsClaimed: 5 });

			expect(store.creditsQuota).toBe(100);
			expect(store.creditsClaimed).toBe(5);
			expect(store.creditsRemaining).toBe(95);
		});
	});

	describe('fetchCredits', () => {
		it('loads the instance credits', async () => {
			vi.mocked(getInstanceAiCredits).mockResolvedValue({ creditsQuota: 50, creditsClaimed: 10 });
			const store = useAssistantCreditsStore();

			await store.fetchCredits();

			expect(store.creditsRemaining).toBe(40);
		});

		it('keeps the credits unknown when the request fails', async () => {
			vi.mocked(getInstanceAiCredits).mockRejectedValue(new Error('offline'));
			const store = useAssistantCreditsStore();

			await store.fetchCredits();

			expect(store.creditsRemaining).toBeUndefined();
		});
	});

	describe('isOutOfCredits', () => {
		it('is false when the balance is still loading', () => {
			const store = useAssistantCreditsStore();
			expect(store.isOutOfCredits).toBe(false);
		});

		it('is false while credits remain, including a low balance', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 95;

			expect(store.creditsRemaining).toBe(5);
			expect(store.isOutOfCredits).toBe(false);
		});

		it('is true when no credits remain', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 800;
			store.creditsClaimed = 800;

			expect(store.isOutOfCredits).toBe(true);
		});
	});

	describe('isLowCredits', () => {
		it('returns false when credits are undefined', () => {
			const store = useAssistantCreditsStore();
			expect(store.isLowCredits).toBe(false);
		});

		it('returns false when credits are above 10%', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 89;
			expect(store.isLowCredits).toBe(false);
		});

		it('returns true when credits are exactly 10%', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 90;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns true when credits are below 10%', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 95;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns false when quota is unlimited', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.isLowCredits).toBe(false);
		});

		it('returns true when quota is 0', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.isLowCredits).toBe(true);
		});

		it('returns true when all credits are consumed', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 100;
			expect(store.isLowCredits).toBe(true);
		});
	});

	describe('creditsPercentageRemaining', () => {
		it('returns undefined when credits are not initialized', () => {
			const store = useAssistantCreditsStore();
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('returns undefined when quota is unlimited', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('returns 0 when quota is 0', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.creditsPercentageRemaining).toBe(0);
		});

		it('calculates percentage correctly', () => {
			const store = useAssistantCreditsStore();
			store.creditsQuota = 100;
			store.creditsClaimed = 75;
			expect(store.creditsPercentageRemaining).toBe(25);
		});
	});
});
