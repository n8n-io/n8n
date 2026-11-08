import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillSyncFlag } from './useSkillSyncFlag';

const posthogState = { value: undefined as boolean | string | undefined };
const isFeatureEnabled = vi.fn(() => posthogState.value === true);

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

describe('useSkillSyncFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		posthogState.value = undefined;
	});

	it.each([
		{ flag: true, enabled: true },
		{ flag: false, enabled: false },
		{ flag: undefined, enabled: false },
		{ flag: 'variant', enabled: false },
	])('is $enabled when the flag is $flag', ({ flag, enabled }) => {
		posthogState.value = flag;

		expect(useSkillSyncFlag().value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(SKILL_SYNC_FLAG);
	});
});
