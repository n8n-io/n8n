import { FLEXIBLE_GROUPS_CANVAS_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFlexibleGroups } from './useFlexibleGroups';

const isFeatureEnabled = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

describe('useFlexibleGroups', () => {
	beforeEach(() => {
		isFeatureEnabled.mockReset();
	});

	it('is enabled when the flag is on', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === FLEXIBLE_GROUPS_CANVAS_FLAG);

		const { isEnabled } = useFlexibleGroups();

		expect(isEnabled.value).toBe(true);
	});

	it('is disabled when the flag is off', () => {
		isFeatureEnabled.mockReturnValue(false);

		const { isEnabled } = useFlexibleGroups();

		expect(isEnabled.value).toBe(false);
		expect(isFeatureEnabled).toHaveBeenCalledWith(FLEXIBLE_GROUPS_CANVAS_FLAG);
	});
});
