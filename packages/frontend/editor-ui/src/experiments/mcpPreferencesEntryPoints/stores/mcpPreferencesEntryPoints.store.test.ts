import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import { MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT } from '@/app/constants/experiments';

import { useMcpPreferencesEntryPointsStore } from './mcpPreferencesEntryPoints.store';

const { mockTrack, mockGetVariant, mockTrackExposure } = vi.hoisted(() => ({
	mockTrack: vi.fn(),
	mockGetVariant: vi.fn(),
	mockTrackExposure: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTrack }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
		trackExposure: mockTrackExposure,
	}),
}));

const featureFlagProperty = `$feature/${MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.name}`;

const setPreferenceSettings = ({
	aiPreferences = true,
	mcpAccess = true,
	mcpPreferences = true,
} = {}) => {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		aiPreferences: { enabled: aiPreferences, managedByEnv: false },
	} as FrontendSettings;
	settingsStore.moduleSettings = {
		mcp: {
			mcpAccessEnabled: mcpAccess,
			mcpManagedByEnv: false,
			autoExposeNewWorkflows: false,
			preferencesEnabled: mcpPreferences,
		},
	};
};

describe('mcpPreferencesEntryPoints store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		vi.clearAllMocks();
		setPreferenceSettings();
	});

	it.each([
		MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.banner,
		MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.connectionRow,
	])('returns the %s entry point', (variant) => {
		mockGetVariant.mockReturnValue(variant);

		expect(useMcpPreferencesEntryPointsStore().entryPoint).toBe(variant);
	});

	it.each([MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.control, undefined, false])(
		'returns no entry point for %s',
		(variant) => {
			mockGetVariant.mockReturnValue(variant);

			expect(useMcpPreferencesEntryPointsStore().entryPoint).toBeUndefined();
		},
	);

	it.each([
		['preferences are off', { aiPreferences: false }],
		['MCP is off', { mcpAccess: false }],
		['MCP preferences are off', { mcpPreferences: false }],
	])('returns no entry point and tracks no exposure when %s', (_, settings) => {
		setPreferenceSettings(settings);
		mockGetVariant.mockReturnValue(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.banner);
		const store = useMcpPreferencesEntryPointsStore();

		store.trackExposure();

		expect(store.entryPoint).toBeUndefined();
		expect(mockTrackExposure).not.toHaveBeenCalled();
	});

	it('tracks exposure for an eligible user', () => {
		mockGetVariant.mockReturnValue(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.control);

		useMcpPreferencesEntryPointsStore().trackExposure();

		expect(mockTrackExposure).toHaveBeenCalledWith(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.name);
	});

	it('keeps the banner dismissed and tracks the dismissal', async () => {
		mockGetVariant.mockReturnValue(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.banner);
		const store = useMcpPreferencesEntryPointsStore();

		store.dismissBanner();

		expect(store.isBannerDismissed).toBe(true);
		expect(mockTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.PREFERENCES_BANNER_DISMISSED, {
			variant: 'banner',
			[featureFlagProperty]: 'banner',
		});

		await nextTick();
		setActivePinia(createPinia());
		expect(useMcpPreferencesEntryPointsStore().isBannerDismissed).toBe(true);
	});

	it('tracks entry point clicks and prompt copies with the variant', () => {
		mockGetVariant.mockReturnValue(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.connectionRow);
		const store = useMcpPreferencesEntryPointsStore();

		store.trackEntryPointClicked('connect_dialog');
		store.trackPromptCopied('cursor');

		expect(mockTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.PREFERENCES_ENTRY_POINT_CLICKED, {
			entry_point: 'connect_dialog',
			variant: 'connection_row',
			[featureFlagProperty]: 'connection_row',
		});
		expect(mockTrack).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.PREFERENCES_PROMPT_COPIED, {
			client: 'cursor',
			variant: 'connection_row',
			[featureFlagProperty]: 'connection_row',
		});
	});

	it('tracks nothing for control', () => {
		mockGetVariant.mockReturnValue(MCP_PREFERENCES_ENTRY_POINTS_EXPERIMENT.control);
		const store = useMcpPreferencesEntryPointsStore();

		store.trackEntryPointClicked('connect_dialog');
		store.trackPromptCopied('cursor');
		store.dismissBanner();

		expect(mockTrack).not.toHaveBeenCalled();
		expect(store.isBannerDismissed).toBe(false);
	});
});
