// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
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
			isRowsVariant: true,
		},
		{
			variant: INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.variantBis,
			isTreatmentVariant: false,
			isRowsVariant: true,
		},
		{
			variant: INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.control,
			isTreatmentVariant: false,
			isRowsVariant: false,
		},
		{ variant: undefined, isTreatmentVariant: false, isRowsVariant: false },
	])(
		'returns isRowsVariant $isRowsVariant when PostHog variant is $variant',
		({ variant, isTreatmentVariant, isRowsVariant }) => {
			getVariant.mockReturnValue(variant);

			const experiment = useInstanceAiInspirationFromTaxonomyExperiment();

			expect(experiment.currentVariant.value).toBe(variant);
			expect(experiment.isTreatmentVariant.value).toBe(isTreatmentVariant);
			expect(experiment.isRowsVariant.value).toBe(isRowsVariant);
			expect(getVariant).toHaveBeenCalledWith(
				INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.name,
			);
		},
	);

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.name);
	});
});
