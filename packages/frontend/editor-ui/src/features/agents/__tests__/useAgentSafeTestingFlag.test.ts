import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentSafeTestingFlag } from '../composables/useAgentSafeTestingFlag';

const flagState = ref<boolean | string | undefined>(false);
const isFeatureEnabled = vi.fn(() => flagState.value === true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

describe('useAgentSafeTestingFlag', () => {
	it('returns true only when the safe-testing PostHog flag is enabled', () => {
		flagState.value = true;
		const enabled = useAgentSafeTestingFlag();

		expect(enabled.value).toBe(true);
		expect(isFeatureEnabled).toHaveBeenCalledWith(AGENT_SAFE_TESTING_FLAG);
	});

	it('returns false when the safe-testing flag is off or unset', () => {
		flagState.value = false;
		const enabled = useAgentSafeTestingFlag();
		expect(enabled.value).toBe(false);

		flagState.value = undefined;
		expect(enabled.value).toBe(false);
	});
});
