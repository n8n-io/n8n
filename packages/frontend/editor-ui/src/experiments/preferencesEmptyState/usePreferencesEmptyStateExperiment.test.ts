import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import {
	EXPERIMENTS_TO_TRACK,
	PREFERENCES_EMPTY_STATE_EXPERIMENT,
} from '@/app/constants/experiments';

import { usePreferencesEmptyStateExperiment } from './usePreferencesEmptyStateExperiment';

const getVariant = vi.fn();
const trackExposure = vi.fn();
const track = vi.fn();
const instanceAiAvailable = ref(true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant, trackExposure })),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => instanceAiAvailable,
}));

describe('usePreferencesEmptyStateExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		trackExposure.mockReset();
		track.mockReset();
		instanceAiAvailable.value = true;
	});

	it.each(['control', 'examples', 'assistant'])('returns the %s variant', (assigned) => {
		getVariant.mockReturnValue(assigned);

		expect(usePreferencesEmptyStateExperiment().variant.value).toBe(assigned);
		expect(getVariant).toHaveBeenCalledWith(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	});

	it.each([undefined, false, 'unknown'])('returns no variant for the flag value %s', (assigned) => {
		getVariant.mockReturnValue(assigned);

		expect(usePreferencesEmptyStateExperiment().variant.value).toBeUndefined();
	});

	it('returns no variant when the n8n Assistant is not available', () => {
		getVariant.mockReturnValue('examples');
		instanceAiAvailable.value = false;

		expect(usePreferencesEmptyStateExperiment().variant.value).toBeUndefined();
	});

	it('tracks the exposure with the experiment payload', () => {
		getVariant.mockReturnValue('assistant');

		usePreferencesEmptyStateExperiment().trackExposure();

		expect(trackExposure).toHaveBeenCalledWith(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.PREFERENCES_EMPTY_STATE_EXPOSED, {
			variant: 'assistant',
			'$feature/127_preferences_empty_state': 'assistant',
		});
	});

	it('tracks no exposure without a variant', () => {
		getVariant.mockReturnValue(undefined);

		usePreferencesEmptyStateExperiment().trackExposure();

		expect(trackExposure).not.toHaveBeenCalled();
		expect(track).not.toHaveBeenCalled();
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	});
});
