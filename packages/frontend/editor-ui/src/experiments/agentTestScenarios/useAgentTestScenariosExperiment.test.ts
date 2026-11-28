import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AGENT_SAFE_TESTING_EXPERIMENT,
	AGENT_TEST_SCENARIOS_EXPERIMENT,
} from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import { useAgentTestScenariosExperiment } from './useAgentTestScenariosExperiment';

describe('useAgentTestScenariosExperiment', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn }));
	});

	function enrol(safeTestingVariant?: string) {
		const posthog = usePostHog();
		vi.mocked(posthog.isVariantEnabled).mockImplementation(
			(flag, variant) =>
				(flag === AGENT_TEST_SCENARIOS_EXPERIMENT.name &&
					variant === AGENT_TEST_SCENARIOS_EXPERIMENT.variant) ||
				(flag === AGENT_SAFE_TESTING_EXPERIMENT.name && variant === safeTestingVariant),
		);
		return posthog;
	}

	it('enables and shows when enrolled in variant and safe testing is off', () => {
		const posthog = enrol();

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(true);
		expect(posthog.isVariantEnabled).toHaveBeenCalledWith(
			AGENT_TEST_SCENARIOS_EXPERIMENT.name,
			AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		);
		expect(posthog.isVariantEnabled).toHaveBeenCalledWith(
			AGENT_SAFE_TESTING_EXPERIMENT.name,
			AGENT_SAFE_TESTING_EXPERIMENT.test,
		);
	});

	it('keeps enrollment false and hides when in control or disabled', () => {
		const posthog = usePostHog();
		vi.mocked(posthog.isVariantEnabled).mockReturnValue(false);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(false);
		expect(shouldShow.value).toBe(false);
	});

	it('hides when 140_agent_safe_testing is assigned to the test variant', () => {
		enrol(AGENT_SAFE_TESTING_EXPERIMENT.test);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(false);
	});

	it('shows when 140_agent_safe_testing is assigned to the control variant', () => {
		enrol(AGENT_SAFE_TESTING_EXPERIMENT.control);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(true);
	});
});
