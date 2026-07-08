import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ENHANCED_HITL_TELEGRAM_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';

import { useEnhancedHitlTelegramExperiment } from './useEnhancedHitlTelegramExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useEnhancedHitlTelegramExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: ENHANCED_HITL_TELEGRAM_EXPERIMENT.variant, enabled: true },
		{ variant: ENHANCED_HITL_TELEGRAM_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useEnhancedHitlTelegramExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(ENHANCED_HITL_TELEGRAM_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(ENHANCED_HITL_TELEGRAM_EXPERIMENT.name);
	});
});
