import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS as suggestions } from '../suggestions';
import WorkflowPreviewSuggestions from './WorkflowPreviewSuggestions.vue';

const telemetryTrack = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const websiteTemplateRepositoryURL = 'https://n8n.io/workflows?utm_instance=test';
vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: () => ({ websiteTemplateRepositoryURL }),
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

	it('links "see all" to the templates website URL with instance parameters', () => {
		const { container } = renderComponent();

		const link = container.querySelector('a');
		expect(link).toHaveAttribute('href', websiteTemplateRepositoryURL);
	});
});
