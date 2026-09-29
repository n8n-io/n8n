import { createPinia, setActivePinia } from 'pinia';
import { INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useTestAgentPreviewExperiment } from './useTestAgentPreviewExperiment';

describe('useTestAgentPreviewExperiment', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([true, false, undefined, 'true', 'variant'])(
		'enables only boolean true (%s)',
		(value) => {
			const posthog = usePostHog();
			posthog.overrides =
				value === undefined ? {} : { [INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.name]: { value } };
			expect(useTestAgentPreviewExperiment().isFeatureEnabled.value).toBe(value === true);
		},
	);
});
