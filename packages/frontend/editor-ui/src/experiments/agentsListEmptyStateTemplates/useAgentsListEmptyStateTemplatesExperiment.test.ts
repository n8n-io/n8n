import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';

import { useAgentsListEmptyStateTemplatesExperiment } from './useAgentsListEmptyStateTemplatesExperiment';

const isFeatureEnabled = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		isFeatureEnabled,
	})),
}));

describe('useAgentsListEmptyStateTemplatesExperiment', () => {
	beforeEach(() => {
		isFeatureEnabled.mockReset();
	});

	it.each([
		{ enrolled: true, enabled: true },
		{ enrolled: false, enabled: false },
	])('returns $enabled when PostHog enrollment is $enrolled', ({ enrolled, enabled }) => {
		isFeatureEnabled.mockReturnValue(enrolled);

		const experiment = useAgentsListEmptyStateTemplatesExperiment();

		expect(experiment.isFeatureEnabled.value).toBe(enabled);
		expect(isFeatureEnabled).toHaveBeenCalledWith(
			AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name,
		);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(AGENTS_LIST_EMPTY_STATE_TEMPLATES_EXPERIMENT.name);
	});
});
