import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT,
} from '@/app/constants/experiments';

import { useN8nCreditsCredentialSelectionExperiment } from './useN8nCreditsCredentialSelectionExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useN8nCreditsCredentialSelectionExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.variant, enabled: true },
		{ variant: N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useN8nCreditsCredentialSelectionExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(N8N_CREDITS_CREDENTIAL_SELECTION_EXPERIMENT.name);
	});
});
