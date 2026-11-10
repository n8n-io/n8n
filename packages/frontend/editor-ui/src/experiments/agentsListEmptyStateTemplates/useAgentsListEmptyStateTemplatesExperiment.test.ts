import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';

import { useAgentsListEmptyStateTemplatesExperiment } from './useAgentsListEmptyStateTemplatesExperiment';

const getVariant = vi.fn();
const trackExposure = vi.fn();
const instanceAiReady = ref(true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant, trackExposure })),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => instanceAiReady,
}));

describe('useAgentsListEmptyStateTemplatesExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		trackExposure.mockReset();
		instanceAiReady.value = true;
	});

	it('enables the templates only for the test variant', () => {
		getVariant.mockReturnValue(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test);

		expect(useAgentsListEmptyStateTemplatesExperiment().isFeatureEnabled.value).toBe(true);
		expect(getVariant).toHaveBeenCalledWith(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	});

	it.each([AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.control, undefined, false, 'unknown'])(
		'does not enable the templates for the flag value %s',
		(assigned) => {
			getVariant.mockReturnValue(assigned);

			expect(useAgentsListEmptyStateTemplatesExperiment().isFeatureEnabled.value).toBe(false);
		},
	);

	it('returns no enabled feature and tracks no exposure when Instance AI is not ready', () => {
		getVariant.mockReturnValue(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test);
		instanceAiReady.value = false;

		const experiment = useAgentsListEmptyStateTemplatesExperiment();
		experiment.trackExposure();

		expect(experiment.isFeatureEnabled.value).toBe(false);
		expect(trackExposure).not.toHaveBeenCalled();
	});

	it.each([
		AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.control,
		AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.test,
	])('tracks exposure for the %s arm', (assigned) => {
		getVariant.mockReturnValue(assigned);

		useAgentsListEmptyStateTemplatesExperiment().trackExposure();

		expect(trackExposure).toHaveBeenCalledTimes(1);
		expect(trackExposure).toHaveBeenCalledWith(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	});

	it('tracks no exposure without a variant', () => {
		getVariant.mockReturnValue(undefined);

		useAgentsListEmptyStateTemplatesExperiment().trackExposure();

		expect(trackExposure).not.toHaveBeenCalled();
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	});
});
