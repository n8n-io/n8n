import { createPinia, setActivePinia } from 'pinia';
import { INSTANCE_AI_CLOUD_BROWSER_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useInstanceAiCloudBrowserExperiment } from './useInstanceAiCloudBrowserExperiment';

describe('instance AI cloud browser enrollment', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([true, false, undefined, 'true', 'variant'])(
		'enables only boolean true (%s)',
		(value) => {
			const posthog = usePostHog();
			posthog.overrides =
				value === undefined ? {} : { [INSTANCE_AI_CLOUD_BROWSER_FLAG]: { value } };
			expect(useInstanceAiCloudBrowserExperiment().isEnabled.value).toBe(value === true);
		},
	);
});
