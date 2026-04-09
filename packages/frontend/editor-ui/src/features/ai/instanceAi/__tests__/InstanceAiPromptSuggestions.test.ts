import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiPromptSuggestions from '../components/InstanceAiPromptSuggestions.vue';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS as suggestions } from '../emptyStateSuggestions';

const renderComponent = createComponentRenderer(InstanceAiPromptSuggestions);

describe('InstanceAiPromptSuggestions', () => {
	it('emits preview changes for prompt pills and quick-example rows', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.hover(getByTestId('instance-ai-suggestion-build-workflow'));
		await userEvent.unhover(getByTestId('instance-ai-suggestion-build-workflow'));

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		await userEvent.unhover(getByTestId('instance-ai-quick-example-monitor-competitors'));

		expect(emitted()['preview-change']).toEqual([
			['instanceAi.emptyState.suggestions.buildWorkflow.prompt'],
			[null],
			[null],
			['instanceAi.emptyState.quickExamples.monitorCompetitors.prompt'],
			[null],
		]);
	});

	it('emits semantic suggestion events for quick examples and prompts', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		expect(emitted()['quick-examples-opened']?.[0]).toEqual([
			{
				suggestionId: 'quick-examples',
				position: 4,
			},
		]);

		await userEvent.click(getByTestId('instance-ai-suggestion-build-agent'));

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.click(getByTestId('instance-ai-quick-example-answer-support-requests'));

		expect(emitted()['submit-suggestion']).toEqual([
			[
				{
					promptKey: 'instanceAi.emptyState.suggestions.buildAgent.prompt',
					suggestionId: 'build-agent',
					suggestionKind: 'prompt',
					position: 2,
				},
			],
			[
				{
					promptKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.prompt',
					suggestionId: 'answer-support-requests',
					suggestionKind: 'quick_example',
					position: 3,
				},
			],
		]);
	});

	it('closes quick examples when the menu button is toggled twice', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		expect(getByTestId('instance-ai-quick-examples-panel')).toBeVisible();

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
	});

	it('closes quick examples and clears preview when Escape is pressed', async () => {
		const { emitted, getByTestId, queryByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		expect(getByTestId('instance-ai-quick-examples-panel')).toBeVisible();

		await fireEvent.keyDown(document, { key: 'Escape' });

		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
		expect(emitted()['preview-change']?.at(-1)).toEqual([null]);
	});

	it('does not emit preview or submit events while disabled', async () => {
		const { emitted, getByTestId, queryByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: true,
			},
		});

		await userEvent.hover(getByTestId('instance-ai-suggestion-build-workflow'));
		await fireEvent.focus(getByTestId('instance-ai-suggestion-build-workflow'));
		await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));
		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
		expect(emitted()['preview-change']).toBeUndefined();
		expect(emitted()['submit-suggestion']).toBeUndefined();
		expect(emitted()['quick-examples-opened']).toBeUndefined();
	});

	it('prevents quick-example preview changes when disabled after opening the panel', async () => {
		const { emitted, getByTestId, rerender } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await rerender({ suggestions, disabled: true });

		const beforePreviewChanges = emitted()['preview-change']?.length ?? 0;
		const beforeQuickExamplesOpened = emitted()['quick-examples-opened']?.length ?? 0;
		const beforeSubmitSuggestion = emitted()['submit-suggestion']?.length ?? 0;

		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		await userEvent.unhover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		await userEvent.click(getByTestId('instance-ai-quick-example-monitor-competitors'));

		expect(getByTestId('instance-ai-quick-examples-panel')).toBeVisible();
		expect(emitted()['preview-change']?.length ?? 0).toBe(beforePreviewChanges);
		expect(emitted()['quick-examples-opened']?.length ?? 0).toBe(beforeQuickExamplesOpened);
		expect(emitted()['submit-suggestion']?.length ?? 0).toBe(beforeSubmitSuggestion);
	});

	it('closes quick examples and clears preview when clicking outside', async () => {
		const { emitted, getByTestId, queryByTestId } = renderComponent({
			props: {
				suggestions,
				disabled: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
		await userEvent.hover(getByTestId('instance-ai-quick-example-monitor-competitors'));
		expect(getByTestId('instance-ai-quick-examples-panel')).toBeVisible();

		await fireEvent.click(document.body);

		expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
		expect(emitted()['preview-change']?.at(-1)).toEqual([null]);
	});
});
