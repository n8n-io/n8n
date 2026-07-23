import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT } from '@/app/constants/experiments';
import { useEvaluationsWizardSidepanelExperiment } from './useEvaluationsWizardSidepanelExperiment';

const { getVariant, settings } = vi.hoisted(() => ({
	getVariant: vi.fn(),
	settings: { evaluation: { configEvalsEnabled: false } as { configEvalsEnabled: boolean } },
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings })),
}));

describe('useEvaluationsWizardSidepanelExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
		settings.evaluation.configEvalsEnabled = false;
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

	it('returns true from the operator override even when PostHog is on the control arm', () => {
		getVariant.mockReturnValue(EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.control);
		settings.evaluation.configEvalsEnabled = true;

		const { isFeatureEnabled } = useEvaluationsWizardSidepanelExperiment();

		expect(isFeatureEnabled.value).toBe(true);
	});
});
