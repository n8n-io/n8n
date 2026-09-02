import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT,
} from '@/app/constants/experiments';

import { useInstanceAiBrowserCredentialSetupExperiment } from './useInstanceAiBrowserCredentialSetupExperiment';

const getVariant = vi.fn();
const isBrowserUseEnabled = ref(true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

vi.mock('@/experiments/instanceAiBrowserUse', () => ({
	useInstanceAiBrowserUseExperiment: vi.fn(() => ({
		isFeatureEnabled: isBrowserUseEnabled,
	})),
}));

describe('useInstanceAiBrowserCredentialSetupExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		isBrowserUseEnabled.value = true;
	});

	it.each([
		{ variant: INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.variant, enabled: true },
		{ variant: INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useInstanceAiBrowserCredentialSetupExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.name);
	});

	it('returns false when Browser Use is disabled', () => {
		getVariant.mockReturnValue(INSTANCE_AI_BROWSER_CREDENTIAL_SETUP_EXPERIMENT.variant);
		isBrowserUseEnabled.value = false;

		const { isFeatureEnabled } = useInstanceAiBrowserCredentialSetupExperiment();

		expect(isFeatureEnabled.value).toBe(false);
	});
});
