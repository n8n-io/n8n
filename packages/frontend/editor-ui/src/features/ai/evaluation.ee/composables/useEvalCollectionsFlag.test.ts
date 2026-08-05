import { describe, expect, it, vi } from 'vitest';

import { useEvalCollectionsFlag } from './useEvalCollectionsFlag';

const settingsState = { collectionsEnabled: false };
const posthogState = { enabled: false };

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { evaluation: { collectionsEnabled: settingsState.collectionsEnabled } },
	}),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => posthogState.enabled }),
}));

describe('useEvalCollectionsFlag', () => {
	it('is enabled via the backend operator override even when PostHog is off', () => {
		// The telemetry-off case: the in-browser PostHog client never initializes,
		// so the flag must come from the settings-provided override.
		settingsState.collectionsEnabled = true;
		posthogState.enabled = false;

		expect(useEvalCollectionsFlag().value).toBe(true);
	});

	it('is enabled via the PostHog cohort flag when the override is off', () => {
		settingsState.collectionsEnabled = false;
		posthogState.enabled = true;

		expect(useEvalCollectionsFlag().value).toBe(true);
	});

	it('is disabled when neither signal is set', () => {
		settingsState.collectionsEnabled = false;
		posthogState.enabled = false;

		expect(useEvalCollectionsFlag().value).toBe(false);
	});
});
