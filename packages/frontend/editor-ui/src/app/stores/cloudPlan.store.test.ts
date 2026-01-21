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
		setActivePinia(createPinia());
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('trialTimeLeft', () => {
		it('should return days when more than 24 hours left', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 3 days from now
			const expirationDate = new Date('2024-01-18T12:00:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 3, unit: 'days' });
		});

		it('should return 2 days when 25 hours left', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 25 hours from now
			const expirationDate = new Date('2024-01-16T13:00:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 2, unit: 'days' });
		});

		it('should return hours when less than 24 hours but more than 1 hour left', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 5 hours from now
			const expirationDate = new Date('2024-01-15T17:00:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 5, unit: 'hours' });
		});

		it('should return 24 hours when exactly 23.5 hours left (rounds up)', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 23.5 hours from now
			const expirationDate = new Date('2024-01-16T11:30:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 24, unit: 'hours' });
		});

		it('should return minutes when less than 1 hour left', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 45 minutes from now
			const expirationDate = new Date('2024-01-15T12:45:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 45, unit: 'minutes' });
		});

		it('should return 1 minute when less than 1 minute left (rounds up)', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 30 seconds from now
			const expirationDate = new Date('2024-01-15T12:00:30Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 1, unit: 'minutes' });
		});

		it('should return 0 minutes when trial has expired', () => {
			const store = useCloudPlanStore();
			const now = new Date('2024-01-15T12:00:00Z');
			vi.setSystemTime(now);

			// Set expiration to 1 hour ago
			const expirationDate = new Date('2024-01-15T11:00:00Z').toISOString();
			store.state.data = { expirationDate } as never;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'minutes' });
		});

		it('should return default value when state.data is null', () => {
			const store = useCloudPlanStore();
			store.state.data = null;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'days' });
		});

		it('should return default value when expirationDate is undefined', () => {
			const store = useCloudPlanStore();
			store.state.data = {} as never;

			expect(store.trialTimeLeft).toEqual({ count: 0, unit: 'days' });
		});
	});
});
