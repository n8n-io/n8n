import { describe, expect, it, vi } from 'vitest';

import { useAgentEvalsFlag } from './useAgentEvalsFlag';

const settingsState = { agentEvalsEnabled: false };
const posthogState = { enabled: false };

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { evaluation: { agentEvalsEnabled: settingsState.agentEvalsEnabled } },
	}),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled: () => posthogState.enabled }),
}));

describe('useAgentEvalsFlag', () => {
	it('is enabled via the backend operator override even when PostHog is off', () => {
		// The telemetry-off case: the in-browser PostHog client never initializes,
		// so the flag must come from the settings-provided override.
		settingsState.agentEvalsEnabled = true;
		posthogState.enabled = false;

		expect(useAgentEvalsFlag().value).toBe(true);
	});

	it('is enabled via the PostHog cohort flag when the override is off', () => {
		settingsState.agentEvalsEnabled = false;
		posthogState.enabled = true;

		expect(useAgentEvalsFlag().value).toBe(true);
	});

	it('is disabled when neither signal is set', () => {
		settingsState.agentEvalsEnabled = false;
		posthogState.enabled = false;

		expect(useAgentEvalsFlag().value).toBe(false);
	});
});
