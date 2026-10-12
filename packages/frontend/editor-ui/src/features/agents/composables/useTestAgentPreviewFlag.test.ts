import { describe, expect, it, vi, beforeEach } from 'vitest';

import { EXPERIMENTS_TO_TRACK } from '@/app/constants/experiments';
import { TEST_AGENT_PREVIEW_FLAG } from '../constants';

import { useTestAgentPreviewFlag } from './useTestAgentPreviewFlag';

const posthogState = { value: undefined as boolean | string | undefined };
const isFeatureEnabled = vi.fn(() => posthogState.value === true);
const settingsState = { forceAgentWorthTesting: false };

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { evaluation: { forceAgentWorthTesting: settingsState.forceAgentWorthTesting } },
	}),
}));

describe('useTestAgentPreviewFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		posthogState.value = undefined;
		settingsState.forceAgentWorthTesting = false;
	});

	it.each([
		{ flag: true, enabled: true },
		{ flag: false, enabled: false },
		{ flag: undefined, enabled: false },
		{ flag: 'control', enabled: false },
		{ flag: 'variant', enabled: false },
	])('returns $enabled when the boolean rollout flag is $flag', ({ flag, enabled }) => {
		posthogState.value = flag;

		expect(useTestAgentPreviewFlag().isFeatureEnabled.value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(TEST_AGENT_PREVIEW_FLAG);
	});

	it.each([false, undefined])('keeps the QA override when the flag is %s', (flag) => {
		posthogState.value = flag;
		settingsState.forceAgentWorthTesting = true;

		expect(useTestAgentPreviewFlag().isFeatureEnabled.value).toBe(true);
	});

	it('does not register the boolean flag for experiment enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).not.toContain(TEST_AGENT_PREVIEW_FLAG);
	});
});
