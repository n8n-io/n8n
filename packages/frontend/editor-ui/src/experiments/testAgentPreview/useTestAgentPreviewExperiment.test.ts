import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT,
} from '@/app/constants/experiments';

import { useTestAgentPreviewExperiment } from './useTestAgentPreviewExperiment';

const getVariant = vi.fn();
const settingsState = { forceAgentWorthTesting: false };

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { evaluation: { forceAgentWorthTesting: settingsState.forceAgentWorthTesting } },
	}),
}));

describe('useTestAgentPreviewExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		settingsState.forceAgentWorthTesting = false;
	});

	it.each([
		{ variant: INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.variant, enabled: true },
		{ variant: INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useTestAgentPreviewExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.name);
	});

	it('is enabled via the forceAgentWorthTesting override even when PostHog is off', () => {
		getVariant.mockReturnValue(INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.control);
		settingsState.forceAgentWorthTesting = true;

		expect(useTestAgentPreviewExperiment().isFeatureEnabled.value).toBe(true);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.name);
	});
});
