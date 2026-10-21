import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	PREFERENCES_EMPTY_STATE_EXPERIMENT,
} from '@/app/constants/experiments';

import { usePreferencesEmptyStateExperiment } from './usePreferencesEmptyStateExperiment';

const getVariant = vi.fn();
const trackExposure = vi.fn();
const instanceAiModule = reactive({ active: true, enabled: true, setupCompleted: true });
const settingsStore = {
	isModuleActive: (name: string) => name === 'instance-ai' && instanceAiModule.active,
	get moduleSettings() {
		return {
			'instance-ai': {
				enabled: instanceAiModule.enabled,
				setupCompleted: instanceAiModule.setupCompleted,
			},
		};
	},
};

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({ getVariant, trackExposure })),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settingsStore,
}));

vi.mock('@/features/ai/instanceAi/instanceAiPermissions', () => ({
	canManageInstanceAi: () => true,
	canMessageInstanceAi: () => true,
}));

describe('usePreferencesEmptyStateExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		trackExposure.mockReset();
		instanceAiModule.active = true;
		instanceAiModule.enabled = true;
		instanceAiModule.setupCompleted = true;
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
		instanceAiModule.enabled = false;

		expect(usePreferencesEmptyStateExperiment().variant.value).toBeUndefined();
	});

	it('returns no variant and tracks no exposure when the n8n Assistant setup is not finished', () => {
		getVariant.mockReturnValue('assistant');
		instanceAiModule.setupCompleted = false;

		const experiment = usePreferencesEmptyStateExperiment();
		experiment.trackExposure();

		expect(experiment.variant.value).toBeUndefined();
		expect(trackExposure).not.toHaveBeenCalled();
	});

	it('tracks the exposure through PostHog', () => {
		getVariant.mockReturnValue('assistant');

		usePreferencesEmptyStateExperiment().trackExposure();

		expect(trackExposure).toHaveBeenCalledTimes(1);
		expect(trackExposure).toHaveBeenCalledWith(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	});

	it('tracks no exposure without a variant', () => {
		getVariant.mockReturnValue(undefined);

		usePreferencesEmptyStateExperiment().trackExposure();

		expect(trackExposure).not.toHaveBeenCalled();
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	});
});
