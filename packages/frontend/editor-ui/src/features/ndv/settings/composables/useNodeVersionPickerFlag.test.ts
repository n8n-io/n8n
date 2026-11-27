import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { NODE_VERSION_PICKER_EXPERIMENT } from '@/app/constants/experiments';

import { useNodeVersionPickerFlag } from './useNodeVersionPickerFlag';

const posthogState = ref<boolean | string | undefined>(undefined);
const isFeatureEnabled = vi.fn(() => posthogState.value === true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

describe('useNodeVersionPickerFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		posthogState.value = undefined;
	});

	it.each([
		{ flag: true, enabled: true },
		{ flag: false, enabled: false },
		{ flag: undefined, enabled: false },
	])('is $enabled when the flag is $flag', ({ flag, enabled }) => {
		posthogState.value = flag;

		expect(useNodeVersionPickerFlag().value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(NODE_VERSION_PICKER_EXPERIMENT.name);
	});

	it('updates when the flag arrives after the first read', () => {
		const isEnabled = useNodeVersionPickerFlag();
		expect(isEnabled.value).toBe(false);

		posthogState.value = true;

		expect(isEnabled.value).toBe(true);
	});
});
