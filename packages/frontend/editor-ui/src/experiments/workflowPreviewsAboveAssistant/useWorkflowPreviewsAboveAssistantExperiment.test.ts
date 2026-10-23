// Experiment cleanup (124_workflow_previews_above_assistant)
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	EXPERIMENTS_TO_TRACK,
	WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT,
} from '@/app/constants/experiments';

import { useWorkflowPreviewsAboveAssistantExperiment } from './useWorkflowPreviewsAboveAssistantExperiment';

const getVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant,
	})),
}));

describe('useWorkflowPreviewsAboveAssistantExperiment', () => {
	beforeEach(() => {
		getVariant.mockReset();
	});

	it.each([
		{ variant: WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.variant, enabled: true },
		{ variant: WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.control, enabled: false },
		{ variant: undefined, enabled: false },
	])('returns $enabled when PostHog variant is $variant', ({ variant, enabled }) => {
		getVariant.mockReturnValue(variant);

		const { isFeatureEnabled } = useWorkflowPreviewsAboveAssistantExperiment();

		expect(isFeatureEnabled.value).toBe(enabled);
		expect(getVariant).toHaveBeenCalledWith(WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.name);
	});

	it.each([
		{ value: WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.variant, variant: 'variant' },
		{ value: WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.control, variant: 'control' },
		{ value: undefined, variant: null },
		{ value: true, variant: null },
		{ value: 'something-else', variant: null },
	])('exposes the assigned variant ($value → $variant)', ({ value, variant }) => {
		getVariant.mockReturnValue(value);

		expect(useWorkflowPreviewsAboveAssistantExperiment().variant.value).toBe(variant);
	});

	it('registers the experiment for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.name);
	});
});
