import { describe, expect, it, vi } from 'vitest';

import { useFlexibleGroups } from './useFlexibleGroups';

const settingsState = { flexibleGroupsEnabled: false };
const posthogState = { enabled: false };

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { workflowsFlexibleGroupsEnabled: settingsState.flexibleGroupsEnabled },
	}),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => posthogState.enabled }),
}));

describe('useFlexibleGroups', () => {
	it('is enabled via the operator override even when the PostHog flag is off', () => {
		// The user payload drops the flags when PostHog answers too slowly at
		// login, so the settings override must still turn the feature on.
		settingsState.flexibleGroupsEnabled = true;
		posthogState.enabled = false;

		expect(useFlexibleGroups().isEnabled.value).toBe(true);
	});

	it('is enabled via the PostHog cohort flag when the override is off', () => {
		settingsState.flexibleGroupsEnabled = false;
		posthogState.enabled = true;

		expect(useFlexibleGroups().isEnabled.value).toBe(true);
	});

	it('is disabled when neither signal is set', () => {
		settingsState.flexibleGroupsEnabled = false;
		posthogState.enabled = false;

		expect(useFlexibleGroups().isEnabled.value).toBe(false);
	});
});
