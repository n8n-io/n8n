import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ENHANCED_HITL_SLACK_EXPERIMENT, EXPERIMENTS_TO_TRACK } from '@/app/constants/experiments';

import { useEnhancedHitlSlackExperiment } from './useEnhancedHitlSlackExperiment';

const isFeatureEnabled = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		isFeatureEnabled,
	})),
}));

describe('useEnhancedHitlSlackExperiment', () => {
	beforeEach(() => {
		isFeatureEnabled.mockReset();
	});

	it.each([
		{ flag: true, enabled: true },
		{ flag: false, enabled: false },
	])('returns $enabled when PostHog flag is $flag', ({ flag, enabled }) => {
		isFeatureEnabled.mockReturnValue(flag);

		const { isFeatureEnabled: result } = useEnhancedHitlSlackExperiment();

		expect(result.value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(ENHANCED_HITL_SLACK_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(ENHANCED_HITL_SLACK_EXPERIMENT.name);
	});
});
