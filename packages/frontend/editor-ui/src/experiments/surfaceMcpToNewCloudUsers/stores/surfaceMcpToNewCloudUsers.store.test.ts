import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import { STORES } from '@n8n/stores';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

const mockTrack = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

const firstOpenSeenStorage = ref<string | null>(null);
const firstOpenDismissedStorage = ref<string | null>(null);

vi.mock('@/app/composables/useStorage', () => ({
	useStorage: (key: string) => {
		if (key === 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_SEEN') {
			return firstOpenSeenStorage;
		}

		if (key === 'N8N_SURFACE_MCP_TO_NEW_CLOUD_USERS_FIRST_OPEN_DISMISSED') {
			return firstOpenDismissedStorage;
		}

		throw new Error(`Unexpected storage key: ${key}`);
	},
}));

const mockGetVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

import { useSurfaceMcpToNewCloudUsersStore } from './surfaceMcpToNewCloudUsers.store';

describe('surfaceMcpToNewCloudUsers store', () => {
	let store: ReturnType<typeof useSurfaceMcpToNewCloudUsersStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockTrack.mockClear();
		mockGetVariant.mockReset();
		firstOpenSeenStorage.value = null;
		firstOpenDismissedStorage.value = null;

		store = useSurfaceMcpToNewCloudUsersStore();
	});

	it('derives the tile variant from PostHog only', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variantTile);

		expect(store.$id).toBe(STORES.EXPERIMENT_SURFACE_MCP_TO_NEW_CLOUD_USERS);
		expect(store.currentVariant).toBe(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variantTile);
		expect(store.isEnabled).toBe(true);
		expect(store.isTileVariant).toBe(true);
		expect(store.isFirstOpenModalVariant).toBe(false);
	});

	it('persists the first eligible open marker', () => {
		store.markFirstEligibleOpenSeen();

		expect(firstOpenSeenStorage.value).toBe('true');
		expect(store.hasSeenFirstEligibleOpen).toBe(true);
	});

	it('persists first-open modal dismissal', () => {
		store.dismissFirstOpenModal();

		expect(firstOpenDismissedStorage.value).toBe('true');
		expect(store.hasDismissedFirstOpenModal).toBe(true);
	});

	it('tracks copied parameter payload with the current variant', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variantFirstOpenModal);

		store.trackCopiedParameter('empty-state', 'claude', 'url');

		expect(mockTrack).toHaveBeenCalledWith('MCP onboarding copied parameter', {
			surface: 'empty-state',
			client: 'claude',
			parameter: 'url',
			variant: SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variantFirstOpenModal,
		});
	});
});
