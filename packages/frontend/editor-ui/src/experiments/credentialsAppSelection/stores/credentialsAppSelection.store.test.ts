import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { CREDENTIALS_APP_SELECTION_EXPERIMENT } from '@/app/constants/experiments';
import type { CredentialsResource } from '@/Interface';

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

const storageRef = ref<string | null>(null);
vi.mock('@/app/composables/useStorage', () => ({
	useStorage: vi.fn(() => storageRef),
}));

const mockGetVariant = vi.fn();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: mockGetVariant,
	})),
}));

let mockUserIsTrialing = false;
vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: vi.fn(() => ({
		get userIsTrialing() {
			return mockUserIsTrialing;
		},
	})),
}));

const mockAllCredentials = ref<CredentialsResource[]>([]);
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: vi.fn(() => ({
		get allCredentials() {
			return mockAllCredentials.value;
		},
	})),
}));

import { useCredentialsAppSelectionStore } from './credentialsAppSelection.store';

describe('credentialsAppSelection store', () => {
	let store: ReturnType<typeof useCredentialsAppSelectionStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockTrack.mockClear();
		mockGetVariant.mockReset();
		storageRef.value = null;
		mockUserIsTrialing = false;
		mockAllCredentials.value = [];

		store = useCredentialsAppSelectionStore();
	});

	describe('isFeatureEnabled', () => {
		it('should return false when dismissed', () => {
			mockGetVariant.mockReturnValue(CREDENTIALS_APP_SELECTION_EXPERIMENT.variant);
			mockUserIsTrialing = true;
			storageRef.value = 'true';

			expect(store.isFeatureEnabled).toBe(false);
		});

		it('should return false when not the correct variant', () => {
			mockGetVariant.mockReturnValue('control');
			mockUserIsTrialing = true;

			expect(store.isFeatureEnabled).toBe(false);
		});

		it('should return false when user is not trialing', () => {
			mockGetVariant.mockReturnValue(CREDENTIALS_APP_SELECTION_EXPERIMENT.variant);
			mockUserIsTrialing = false;

			expect(store.isFeatureEnabled).toBe(false);
		});

		it('should return true when variant matches, user is trialing, and not dismissed', () => {
			mockGetVariant.mockReturnValue(CREDENTIALS_APP_SELECTION_EXPERIMENT.variant);
			mockUserIsTrialing = true;

			expect(store.isFeatureEnabled).toBe(true);
		});
	});

	describe('dismiss', () => {
		it('should set storage to true', () => {
			store.dismiss();

			expect(storageRef.value).toBe('true');
			expect(store.isDismissed).toBe(true);
		});
	});

	describe('reset', () => {
		it('should clear the storage', () => {
			storageRef.value = 'true';

			store.reset();

			expect(storageRef.value).toBeNull();
			expect(store.isDismissed).toBe(false);
		});
	});

	describe('trackCompleted', () => {
		it('should fire telemetry with connected apps and dismiss', () => {
			const connectedApps = [
				{ credential_type: 'slack', is_valid: true },
				{ credential_type: 'github', is_valid: false },
			];
			mockAllCredentials.value = [
				{ id: '1', name: 'Slack', type: 'slack' },
				{ id: '2', name: 'GitHub', type: 'github' },
			] as CredentialsResource[];

			store.trackCompleted(connectedApps);

			expect(mockTrack).toHaveBeenCalledWith('App selection completed', {
				connected_count: 2,
				connected_apps: connectedApps,
			});
			expect(store.isDismissed).toBe(true);
		});
	});

	describe('trackPageViewed', () => {
		it('should fire telemetry', () => {
			store.trackPageViewed();

			expect(mockTrack).toHaveBeenCalledWith('App selection page viewed');
		});
	});

	describe('trackSearchPerformed', () => {
		it('should fire telemetry with correct params', () => {
			store.trackSearchPerformed('slack', 3);

			expect(mockTrack).toHaveBeenCalledWith('App selection search performed', {
				search_term: 'slack',
				result_count: 3,
			});
		});
	});

	describe('connectedCount', () => {
		it('should reflect credentials store length', () => {
			expect(store.connectedCount).toBe(0);

			mockAllCredentials.value = [
				{ id: '1', name: 'Slack', type: 'slack' },
			] as CredentialsResource[];

			expect(store.connectedCount).toBe(1);
		});
	});

	describe('canContinue', () => {
		it('should return false when no credentials', () => {
			expect(store.canContinue).toBe(false);
		});

		it('should return true when credentials exist', () => {
			mockAllCredentials.value = [
				{ id: '1', name: 'Slack', type: 'slack' },
			] as CredentialsResource[];

			expect(store.canContinue).toBe(true);
		});
	});
});
