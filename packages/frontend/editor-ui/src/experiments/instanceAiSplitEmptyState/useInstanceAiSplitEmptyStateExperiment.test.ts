import { describe, expect, it, vi } from 'vitest';
import { INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT } from '@/app/constants/experiments';
import { useInstanceAiSplitEmptyStateExperiment } from './useInstanceAiSplitEmptyStateExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant }),
}));

describe('useInstanceAiSplitEmptyStateExperiment', () => {
	it('enables the variant', () => {
		getVariant.mockReturnValue(INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT.variant);
		const { isFeatureEnabled, isVariantEnabled, currentVariant } =
			useInstanceAiSplitEmptyStateExperiment();

		expect(isFeatureEnabled.value).toBe(true);
		expect(isVariantEnabled.value).toBe(true);
		expect(currentVariant.value).toBe('variant');
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT.name);
	});

	it.each([
		['control'],
		[undefined],
		[true],
		['variant-examples-shelf'],
		['variant-manual-build-cta'],
	])('is disabled for %s', (variant) => {
		getVariant.mockReturnValue(variant);
		const { isFeatureEnabled, isVariantEnabled } = useInstanceAiSplitEmptyStateExperiment();

		expect(isFeatureEnabled.value).toBe(false);
		expect(isVariantEnabled.value).toBe(false);
	});
});
