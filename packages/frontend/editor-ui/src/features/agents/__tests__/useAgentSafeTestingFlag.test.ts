import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useAgentSafeTestingFlag } from '../composables/useAgentSafeTestingFlag';

const flagState = ref<boolean | string | undefined>(undefined);
const isVariantEnabled = vi.fn((_flag: string, variant: string) => flagState.value === variant);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isVariantEnabled }),
}));

describe('useAgentSafeTestingFlag', () => {
	it('returns true only in the test variant of the safe-testing experiment', () => {
		flagState.value = 'test';
		const enabled = useAgentSafeTestingFlag();

		expect(enabled.value).toBe(true);
		expect(isVariantEnabled).toHaveBeenCalledWith(AGENT_SAFE_TESTING_FLAG, 'test');
	});

	it('returns false in control, for a boolean flag, or when unset', () => {
		const enabled = useAgentSafeTestingFlag();

		flagState.value = 'control';
		expect(enabled.value).toBe(false);

		flagState.value = true;
		expect(enabled.value).toBe(false);

		flagState.value = undefined;
		expect(enabled.value).toBe(false);
	});
});
