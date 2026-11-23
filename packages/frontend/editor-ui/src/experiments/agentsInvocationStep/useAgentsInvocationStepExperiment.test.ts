import { createPinia, setActivePinia } from 'pinia';

import {
	AGENTS_INVOCATION_STEP_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentsInvocationStepExperiment } from './useAgentsInvocationStepExperiment';

describe('agents invocation step enrollment', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([
		['variant', true],
		['control', false],
		[undefined, false],
		[true, false],
		['other', false],
	] as const)('enables only the variant arm (flag=%s)', (value, enabled) => {
		const posthog = usePostHog();
		posthog.overrides =
			value === undefined ? {} : { [AGENTS_INVOCATION_STEP_EXPERIMENT.name]: { value } };

		expect(useAgentsInvocationStepExperiment().isEnabled.value).toBe(enabled);
	});

	it('is registered in EXPERIMENTS_TO_TRACK', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(AGENTS_INVOCATION_STEP_EXPERIMENT.name);
	});
});
