// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import { createTestingPinia } from '@pinia/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { mockedStore } from '@/__tests__/utils';
import { INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import { useDraftWorkflowPreviewEnabled } from './useDraftWorkflowPreviewEnabled';

describe('useDraftWorkflowPreviewEnabled', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('is on for the variant', () => {
		mockedStore(usePostHog).getVariant.mockImplementation((name) =>
			name === INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.name
				? INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant
				: undefined,
		);

		expect(useDraftWorkflowPreviewEnabled().value).toBe(true);
	});

	it('is off for the control group', () => {
		mockedStore(usePostHog).getVariant.mockReturnValue(
			INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.control,
		);

		expect(useDraftWorkflowPreviewEnabled().value).toBe(false);
	});
});
