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

type CopiedParameter = Parameters<
	ReturnType<typeof useSurfaceMcpToNewCloudUsersStore>['trackCopiedParameter']
>[2];

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

	it.each([
		SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1,
		SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2,
	])('derives tile entry state from PostHog variant %s', (variant) => {
		mockGetVariant.mockReturnValue(variant);

		expect(store.$id).toBe(STORES.EXPERIMENT_SURFACE_MCP_TO_NEW_CLOUD_USERS);
		expect(store.currentVariant).toBe(variant);
		expect(store.isEnabled).toBe(true);
		expect(store.isTileVariant).toBe(true);
		expect(store.isFirstOpenModalVariant).toBe(false);
	});

	it('treats the control variant as experiment enrollment', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.control);

		expect(store.currentVariant).toBe(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.control);
		expect(store.isEnabled).toBe(true);
		expect(store.isTileVariant).toBe(false);
		expect(store.isFirstOpenModalVariant).toBe(false);
	});

	it('persists the first eligible open marker for the retained intro modal', () => {
		store.markFirstEligibleOpenSeen();

		expect(firstOpenSeenStorage.value).toBe('true');
		expect(store.hasSeenFirstEligibleOpen).toBe(true);
	});

	it('persists first-open modal dismissal for the retained intro modal', () => {
		store.dismissFirstOpenModal();

		expect(firstOpenDismissedStorage.value).toBe('true');
		expect(store.hasDismissedFirstOpenModal).toBe(true);
		expect(firstOpenSeenStorage.value).toBe('true');
		expect(store.hasSeenFirstEligibleOpen).toBe(true);
	});

	it('tracks copied parameter payload with the current variant', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1);
		expectTypeOf<CopiedParameter>().toEqualTypeOf<
			'agent-prompt' | 'server-url' | 'chatgpt-app-name'
		>();

		store.trackCopiedParameter('tile', 'chatgpt', 'server-url');

		expect(mockTrack).toHaveBeenCalledWith('MCP onboarding copied parameter', {
			surface: 'tile',
			client: 'chatgpt',
			parameter: 'server-url',
			variant: SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1,
		});
	});

	it('tracks entry point views with the current variant', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2);

		store.trackEntryPointViewed('tile', 'empty_state_tile', false);

		expect(mockTrack).toHaveBeenCalledWith('MCP onboarding entry point viewed', {
			surface: 'tile',
			entry_point: 'empty_state_tile',
			mcp_access_enabled: false,
			variant: SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2,
		});
	});

	it('tracks eligible empty-state opportunities with the current variant', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.control);

		store.trackOpportunityViewed('tile', 'empty_state_tile', false, null, false);

		expect(mockTrack).toHaveBeenCalledWith('MCP onboarding opportunity viewed', {
			surface: 'tile',
			entry_point: 'empty_state_tile',
			eligible: true,
			surface_available: false,
			suppressed_by: null,
			mcp_access_enabled: false,
			variant: SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.control,
		});
	});

	it('tracks setup visibility with the current variant', () => {
		mockGetVariant.mockReturnValue(SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2);

		store.trackSetupShown('tile', 'chatgpt', 'chatgpt_custom_app');

		expect(mockTrack).toHaveBeenCalledWith('MCP onboarding setup shown', {
			surface: 'tile',
			client: 'chatgpt',
			setup_type: 'chatgpt_custom_app',
			variant: SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2,
		});
	});
});
