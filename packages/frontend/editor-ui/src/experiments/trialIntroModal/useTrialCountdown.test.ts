import { effectScope } from 'vue';

let mockExpirationDate: string | undefined;

vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: () => ({
		get currentPlanData() {
			return mockExpirationDate ? { expirationDate: mockExpirationDate } : null;
		},
	}),
}));

import { useTrialCountdown } from './useTrialCountdown';

describe('useTrialCountdown', () => {
	const now = new Date('2026-07-21T00:00:00.000Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
		mockExpirationDate = undefined;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('formats days, hours and minutes when more than a day remains', () => {
		const msLeft = ((13 * 24 + 23) * 60 + 57) * 60 * 1000 + 30 * 1000;
		mockExpirationDate = new Date(now.getTime() + msLeft).toISOString();

		const scope = effectScope();
		scope.run(() => {
			const { countdownText } = useTrialCountdown();
			expect(countdownText.value).toBe('13d 23h 57m');
		});
		scope.stop();
	});

	it('omits days when less than a day remains', () => {
		const msLeft = (23 * 60 + 57) * 60 * 1000;
		mockExpirationDate = new Date(now.getTime() + msLeft).toISOString();

		const scope = effectScope();
		scope.run(() => {
			const { countdownText } = useTrialCountdown();
			expect(countdownText.value).toBe('23h 57m');
		});
		scope.stop();
	});

	it('omits days and hours when less than an hour remains', () => {
		const msLeft = 57 * 60 * 1000;
		mockExpirationDate = new Date(now.getTime() + msLeft).toISOString();

		const scope = effectScope();
		scope.run(() => {
			const { countdownText } = useTrialCountdown();
			expect(countdownText.value).toBe('57m');
		});
		scope.stop();
	});

	it('is undefined when the trial has already expired', () => {
		mockExpirationDate = new Date(now.getTime() - 60 * 1000).toISOString();

		const scope = effectScope();
		scope.run(() => {
			const { countdownText } = useTrialCountdown();
			expect(countdownText.value).toBeUndefined();
		});
		scope.stop();
	});

	it('is undefined without an expiration date', () => {
		mockExpirationDate = undefined;

		const scope = effectScope();
		scope.run(() => {
			const { countdownText } = useTrialCountdown();
			expect(countdownText.value).toBeUndefined();
		});
		scope.stop();
	});
});
