import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NODE_VERSION_PICKER_EXPERIMENT } from '@/app/constants/experiments';

import { useNodeVersionPickerFlag } from './useNodeVersionPickerFlag';

const posthogState = { value: undefined as boolean | string | undefined };
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
});
