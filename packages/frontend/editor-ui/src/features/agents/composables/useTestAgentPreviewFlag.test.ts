import { describe, expect, it, vi, beforeEach } from 'vitest';

import { EXPERIMENTS_TO_TRACK } from '@/app/constants/experiments';
import { AGENT_EVALS_FLAG } from '@n8n/api-types';

import { useTestAgentPreviewFlag } from './useTestAgentPreviewFlag';

const posthogState = { value: undefined as boolean | string | undefined };
const isFeatureEnabled = vi.fn(() => posthogState.value === true);
const settingsState = { forceAgentWorthTesting: false, agentEvalsEnabled: false };

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: { evaluation: settingsState },
	}),
}));

describe('useTestAgentPreviewFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		posthogState.value = undefined;
		settingsState.forceAgentWorthTesting = false;
		settingsState.agentEvalsEnabled = false;
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
		expect(isFeatureEnabled).toHaveBeenCalledWith(AGENT_EVALS_FLAG);
	});

	it.each([false, undefined, 'control', 'variant'])(
		'does not enable the preview with the QA override when the main flag is %s',
		(flag) => {
			posthogState.value = flag;
			settingsState.forceAgentWorthTesting = true;

			expect(useTestAgentPreviewFlag().isFeatureEnabled.value).toBe(false);
		},
	);

	it('keeps the preview available for an enabled eval cohort when eligibility is forced', () => {
		posthogState.value = true;
		settingsState.forceAgentWorthTesting = true;

		expect(useTestAgentPreviewFlag().isFeatureEnabled.value).toBe(true);
	});

	it('uses the backend eval override when PostHog is unavailable', () => {
		settingsState.agentEvalsEnabled = true;

		expect(useTestAgentPreviewFlag().isFeatureEnabled.value).toBe(true);
	});

	it('does not register the boolean flag for experiment enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).not.toContain(AGENT_EVALS_FLAG);
	});
});
