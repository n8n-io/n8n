import { createPinia, setActivePinia } from 'pinia';
import { useCloudPlanStore } from './cloudPlan.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		baseUrl: 'http://localhost:5678',
	})),
}));

const mockPermanentlyDismissedBanners: string[] = [];
vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		settings: { n8nMetadata: { userId: 'test-user-id' } },
		isCloudDeployment: true,
		permanentlyDismissedBanners: mockPermanentlyDismissedBanners,
	})),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(() => true),
}));

vi.mock('@n8n/rest-api-client/api/cloudPlans', () => ({
	getAdminPanelLoginCode: vi.fn(),
	getCurrentPlan: vi.fn(),
	getCurrentUsage: vi.fn(),
	getCloudUserInfo: vi.fn(),
}));

vi.mock('./posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: vi.fn(),
	})),
}));

describe('cloudPlan.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('trialTimeLeft', () => {
		it('should return days when more than 24 hours left', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-24T12:00:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 3, unit: 'days' });
		});

		it('should return 2 days when 25 hours left', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-22T13:00:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 2, unit: 'days' });
		});

		it('should return hours when less than 24 hours but more than 1 hour left', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-21T17:00:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 5, unit: 'hours' });
		});

		it('should return 24 hours when exactly 23.5 hours left (rounds up)', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-22T11:30:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 24, unit: 'hours' });
		});

		it('should return minutes when less than 1 hour left', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-21T12:45:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 45, unit: 'minutes' });
		});

		it('should return 1 minute when less than 1 minute left (rounds up)', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-21T12:00:30Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 1, unit: 'minutes' });
		});

		it('should return 0 minutes when trial has expired', () => {
			vi.setSystemTime(new Date('2026-01-21T12:00:00Z'));
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			store.state.data = { expirationDate: '2026-01-21T11:00:00Z' } as never;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'minutes' });
		});

		it('should return default value when state.data is null', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = null;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'days' });
		});

		it('should return default value when expirationDate is undefined', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = {} as never;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'days' });
		});
	});

	describe('shouldShowBanner', () => {
		beforeEach(() => {
			// Reset dismissed banners array before each test
			mockPermanentlyDismissedBanners.length = 0;
		});

		it('should return false when bannerConfig is not set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = {} as never;

			expect(store.shouldShowBanner).toBe(false);
		});

		it('should return true when bannerConfig is set and banner not dismissed', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: true } } as never;

			expect(store.shouldShowBanner).toBe(true);
		});

		it('should return false when bannerConfig is set but banner was dismissed', () => {
			mockPermanentlyDismissedBanners.push('TRIAL');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: true } } as never;

			expect(store.shouldShowBanner).toBe(false);
		});

		it('should return false when TRIAL_OVER was dismissed', () => {
			mockPermanentlyDismissedBanners.push('TRIAL_OVER');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: true } } as never;

			expect(store.shouldShowBanner).toBe(false);
		});

		it('should return true when banner was dismissed but forceShow is true', () => {
			mockPermanentlyDismissedBanners.push('TRIAL');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: true, forceShow: true } } as never;

			expect(store.shouldShowBanner).toBe(true);
		});

		it('should return true when not dismissible, even if banner was previously dismissed', () => {
			mockPermanentlyDismissedBanners.push('TRIAL');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = {
				bannerConfig: { showExecutions: true, dismissible: false },
			} as never;

			expect(store.shouldShowBanner).toBe(true);
		});

		it('should return true when not dismissible and banner was never dismissed', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = {
				bannerConfig: { showExecutions: true, dismissible: false },
			} as never;

			expect(store.shouldShowBanner).toBe(true);
		});
	});

	describe('bannerForceShow', () => {
		it('should return false when forceShow is not set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: {} } as never;

			expect(store.bannerForceShow).toBe(false);
		});

		it('should return true when forceShow is true', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { forceShow: true } } as never;

			expect(store.bannerForceShow).toBe(true);
		});

		it('should return false when forceShow is false', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { forceShow: false } } as never;

			expect(store.bannerForceShow).toBe(false);
		});
	});

	describe('isBannerDismissed', () => {
		beforeEach(() => {
			mockPermanentlyDismissedBanners.length = 0;
		});

		it('should return false when no banners are dismissed', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			expect(store.isBannerDismissed).toBe(false);
		});

		it('should return true when TRIAL is dismissed', () => {
			mockPermanentlyDismissedBanners.push('TRIAL');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			expect(store.isBannerDismissed).toBe(true);
		});

		it('should return true when TRIAL_OVER is dismissed', () => {
			mockPermanentlyDismissedBanners.push('TRIAL_OVER');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			expect(store.isBannerDismissed).toBe(true);
		});

		it('should return false when other banners are dismissed', () => {
			mockPermanentlyDismissedBanners.push('V1', 'EMAIL_CONFIRMATION');
			setActivePinia(createPinia());
			const store = useCloudPlanStore();

			expect(store.isBannerDismissed).toBe(false);
		});
	});

	describe('bannerTimeLeft', () => {
		it('should return show: false when timeLeft is not set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: {} } as never;

			expect(store.bannerTimeLeft).toEqual({ show: false, text: undefined });
		});

		it('should return show: true with text when timeLeft is set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { timeLeft: { text: '5 days left' } } } as never;

			expect(store.bannerTimeLeft).toEqual({ show: true, text: '5 days left' });
		});

		it('should return show: true with undefined text when timeLeft has no text', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { timeLeft: {} } } as never;

			expect(store.bannerTimeLeft).toEqual({ show: true, text: undefined });
		});
	});

	describe('showExecutions', () => {
		it('should return false when showExecutions is not set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: {} } as never;

			expect(store.showExecutions).toBe(false);
		});

		it('should return true when showExecutions is true', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: true } } as never;

			expect(store.showExecutions).toBe(true);
		});

		it('should return false when showExecutions is false', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { showExecutions: false } } as never;

			expect(store.showExecutions).toBe(false);
		});
	});

	describe('bannerCta', () => {
		it('should return defaults when cta is not set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: {} } as never;

			expect(store.bannerCta).toEqual({
				text: 'Upgrade Now',
				icon: 'zap',
				size: 'small',
				style: 'success',
				href: undefined,
			});
		});

		it('should return custom values when cta is set', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = {
				bannerConfig: {
					cta: {
						text: 'Subscribe',
						icon: 'star',
						size: 'medium',
						style: 'primary',
						href: '/upgrade',
					},
				},
			} as never;

			expect(store.bannerCta).toEqual({
				text: 'Subscribe',
				icon: 'star',
				size: 'medium',
				style: 'primary',
				href: '/upgrade',
			});
		});
	});

	describe('bannerDismissible', () => {
		it('should return true by default', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: {} } as never;

			expect(store.bannerDismissible).toBe(true);
		});

		it('should return false when dismissible is false', () => {
			setActivePinia(createPinia());
			const store = useCloudPlanStore();
			store.state.data = { bannerConfig: { dismissible: false } } as never;

			expect(store.bannerDismissible).toBe(false);
		});
	});
});
