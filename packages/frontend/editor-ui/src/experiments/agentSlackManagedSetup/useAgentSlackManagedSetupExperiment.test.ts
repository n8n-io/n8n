import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AGENT_SLACK_MANAGED_SETUP_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';

import { useAgentSlackManagedSetupExperiment } from './useAgentSlackManagedSetupExperiment';

const isFeatureEnabled = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		isFeatureEnabled,
	})),
}));

describe('useAgentSlackManagedSetupExperiment', () => {
	beforeEach(() => {
		isFeatureEnabled.mockReset();
	});

	it.each([
		{ flagValue: true, enabled: true },
		{ flagValue: false, enabled: false },
		{ flagValue: undefined, enabled: false },
	])('returns $enabled when the feature flag is $flagValue', ({ flagValue, enabled }) => {
		isFeatureEnabled.mockReturnValue(flagValue);

		const experiment = useAgentSlackManagedSetupExperiment();

		expect(experiment.isFeatureEnabled.value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(AGENT_SLACK_MANAGED_SETUP_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(AGENT_SLACK_MANAGED_SETUP_EXPERIMENT.name);
	});
});
