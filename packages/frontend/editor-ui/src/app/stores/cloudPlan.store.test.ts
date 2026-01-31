import { createPinia, setActivePinia } from 'pinia';
import { useCloudPlanStore } from './cloudPlan.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		baseUrl: 'http://localhost:5678',
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		settings: { n8nMetadata: { userId: 'test-user-id' } },
		isCloudDeployment: true,
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
});
