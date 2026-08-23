import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT,
} from '@/app/constants/experiments';

import { useInstanceAiMcpConnectionsExperiment } from './useInstanceAiMcpConnectionsExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useInstanceAiMcpConnectionsExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.variant, enabled: true },
		{ variant: INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useInstanceAiMcpConnectionsExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.name);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_MCP_CONNECTIONS_EXPERIMENT.name);
	});
});
