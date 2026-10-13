import { AI_ASSISTANT_AT_MENTIONS_FLAG } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AI_ASSISTANT_AT_MENTIONS_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';

import { useIsAssistantAtMentionsEnabled } from './useIsAssistantAtMentionsEnabled';

const isFeatureEnabled = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

describe('useIsAssistantAtMentionsEnabled', () => {
	beforeEach(() => {
		isFeatureEnabled.mockReset();
	});

	it.each([true, false])('reflects the shared rollout flag when it is %s', (enabled) => {
		isFeatureEnabled.mockReturnValue(enabled);

		expect(useIsAssistantAtMentionsEnabled().value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledExactlyOnceWith(AI_ASSISTANT_AT_MENTIONS_FLAG);
	});

	it('registers the flag for experiment exposure tracking', () => {
		expect(AI_ASSISTANT_AT_MENTIONS_EXPERIMENT.name).toBe(AI_ASSISTANT_AT_MENTIONS_FLAG);
		expect(EXPERIMENTS_TO_TRACK).toContain(AI_ASSISTANT_AT_MENTIONS_FLAG);
	});
});
