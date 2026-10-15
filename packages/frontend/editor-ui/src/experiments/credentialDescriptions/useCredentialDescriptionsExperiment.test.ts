import { createPinia, setActivePinia } from 'pinia';
import { CREDENTIAL_DESCRIPTIONS_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCredentialDescriptionsExperiment } from './useCredentialDescriptionsExperiment';

describe('credential descriptions enrollment', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it.each([true, false, undefined, 'true', 'variant'])(
		'enables only boolean true (%s)',
		(value) => {
			const posthog = usePostHog();
			posthog.overrides = value === undefined ? {} : { [CREDENTIAL_DESCRIPTIONS_FLAG]: { value } };
			expect(useCredentialDescriptionsExperiment().isEnabled.value).toBe(value === true);
		},
	);
});
