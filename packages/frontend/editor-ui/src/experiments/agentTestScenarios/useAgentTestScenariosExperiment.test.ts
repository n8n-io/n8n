import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TEST_SCENARIOS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import { useAgentTestScenariosExperiment } from './useAgentTestScenariosExperiment';

describe('useAgentTestScenariosExperiment', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ createSpy: vi.fn }));
	});

	it('enables and shows when enrolled in variant and safe testing is off', () => {
		const posthog = usePostHog();
		vi.mocked(posthog.isVariantEnabled).mockImplementation(
			(flag, variant) =>
				flag === AGENT_TEST_SCENARIOS_EXPERIMENT.name &&
				variant === AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		);
		vi.mocked(posthog.isFeatureEnabled).mockReturnValue(false);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(true);
		expect(posthog.isVariantEnabled).toHaveBeenCalledWith(
			AGENT_TEST_SCENARIOS_EXPERIMENT.name,
			AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		);
		expect(posthog.isFeatureEnabled).toHaveBeenCalledWith(AGENT_SAFE_TESTING_FLAG);
	});

	it('keeps enrollment false and hides when in control or disabled', () => {
		const posthog = usePostHog();
		vi.mocked(posthog.isVariantEnabled).mockReturnValue(false);
		vi.mocked(posthog.isFeatureEnabled).mockReturnValue(false);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(false);
		expect(shouldShow.value).toBe(false);
	});

	it('hides when 140_agent_safe_testing is enabled as a boolean flag', () => {
		const posthog = usePostHog();
		vi.mocked(posthog.isVariantEnabled).mockImplementation(
			(flag, variant) =>
				flag === AGENT_TEST_SCENARIOS_EXPERIMENT.name &&
				variant === AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		);
		vi.mocked(posthog.isFeatureEnabled).mockImplementation(
			(flag) => flag === AGENT_SAFE_TESTING_FLAG,
		);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(false);
	});

	it('hides when 140_agent_safe_testing is assigned to variant', () => {
		const posthog = usePostHog();
		vi.mocked(posthog.isFeatureEnabled).mockReturnValue(false);
		vi.mocked(posthog.isVariantEnabled).mockImplementation(
			(flag, variant) =>
				(flag === AGENT_TEST_SCENARIOS_EXPERIMENT.name &&
					variant === AGENT_TEST_SCENARIOS_EXPERIMENT.variant) ||
				(flag === AGENT_SAFE_TESTING_FLAG && variant === 'variant'),
		);

		const { isEnabled, shouldShow } = useAgentTestScenariosExperiment();

		expect(isEnabled.value).toBe(true);
		expect(shouldShow.value).toBe(false);
	});
});
