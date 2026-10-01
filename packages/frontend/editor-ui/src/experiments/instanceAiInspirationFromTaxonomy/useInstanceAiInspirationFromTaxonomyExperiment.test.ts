import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT,
} from '@/app/constants/experiments';

import { useInstanceAiInspirationFromTaxonomyExperiment } from './useInstanceAiInspirationFromTaxonomyExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useInstanceAiInspirationFromTaxonomyExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{
			variant: INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.variant,
			isTreatmentVariant: true,
		},
		{
			variant: INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.control,
			isTreatmentVariant: false,
		},
		{ variant: undefined, isTreatmentVariant: false },
	])(
		'returns isTreatmentVariant $isTreatmentVariant when PostHog variant is $variant',
		({ variant, isTreatmentVariant }) => {
			getVariant.mockReturnValue(variant);

			const experiment = useInstanceAiInspirationFromTaxonomyExperiment();

			expect(experiment.currentVariant.value).toBe(variant);
			expect(experiment.isTreatmentVariant.value).toBe(isTreatmentVariant);
			expect(getVariant).toHaveBeenCalledWith(
				INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.name,
			);
		},
	);

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.name);
	});
});
