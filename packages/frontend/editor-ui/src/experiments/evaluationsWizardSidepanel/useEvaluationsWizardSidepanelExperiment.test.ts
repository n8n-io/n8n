import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT } from '@/app/constants/experiments';
import { useEvaluationsWizardSidepanelExperiment } from './useEvaluationsWizardSidepanelExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useEvaluationsWizardSidepanelExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.variant, enabled: true },
		{ variant: EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useEvaluationsWizardSidepanelExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.name);
	});
});
