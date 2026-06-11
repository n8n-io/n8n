import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS as suggestions } from '../suggestions';
import WorkflowPreviewSuggestions from './WorkflowPreviewSuggestions.vue';

const telemetryTrack = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const renderComponent = createComponentRenderer(WorkflowPreviewSuggestions, {
	props: {
		suggestions,
		disabled: false,
	},
});

describe('WorkflowPreviewSuggestions', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
	});

	it('inserts the clicked suggestion without submitting it', async () => {
		const { emitted, getByTestId } = renderComponent();
		const suggestion = suggestions[1];

		expect(suggestion).toBeDefined();
		if (!suggestion) throw new Error('Missing workflow preview suggestion fixture');

		await fireEvent.click(getByTestId(`instance-ai-suggestion-${suggestion.id}`));

		expect(emitted()['insert-suggestion']).toEqual([
			[
				{
					promptKey: suggestion.promptKey,
					suggestionId: suggestion.id,
					suggestionKind: 'prompt',
					position: 2,
				},
			],
		]);
		expect(emitted()['submit-suggestion']).toBeUndefined();
		expect(emitted()['preview-change']).toEqual([[null]]);
		expect(emitted()['workflow-preview']).toEqual([[null]]);
		expect(telemetryTrack).toHaveBeenCalledWith('AI Assistant suggestion button clicked', {
			suggestion_id: suggestion.id,
		});
	});
});
