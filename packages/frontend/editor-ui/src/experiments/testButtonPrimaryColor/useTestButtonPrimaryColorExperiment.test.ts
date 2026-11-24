import { createPinia, setActivePinia } from 'pinia';

import { TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useTestButtonPrimaryColorExperiment } from './useTestButtonPrimaryColorExperiment';

describe('test button primary color enrollment', () => {
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
			value === undefined ? {} : { [TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT.name]: { value } };
		expect(useTestButtonPrimaryColorExperiment().isEnabled.value).toBe(enabled);
	});
});
