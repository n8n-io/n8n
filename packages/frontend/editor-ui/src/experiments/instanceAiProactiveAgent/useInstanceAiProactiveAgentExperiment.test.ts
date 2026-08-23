import { describe, expect, it, vi, beforeEach } from 'vitest';
import { INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT } from '@/app/constants/experiments';
import { useInstanceAiProactiveAgentExperiment } from './useInstanceAiProactiveAgentExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useInstanceAiProactiveAgentExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT.variant, enabled: true },
		{ variant: INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useInstanceAiProactiveAgentExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT.name);
	});
});
