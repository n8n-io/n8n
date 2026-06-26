import { fireEvent } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import InstanceAiPersonalizedPromptSuggestions from './InstanceAiPersonalizedPromptSuggestions.vue';

const suggestions = [
	{
		id: 'initial-1',
		shortTitle: 'Qualify hot leads',
		description: 'Score new form submissions and assign the best ones',
		builderPrompt: 'Build a lead qualification workflow',
	},
	{
		id: 'initial-2',
		shortTitle: 'Draft follow-ups',
		description: 'Write and send timely replies after meetings',
		builderPrompt: 'Build a follow-up workflow',
	},
	{
		id: 'initial-3',
		shortTitle: 'Research accounts',
		description: 'Collect company details before outreach',
		builderPrompt: 'Build an account research workflow',
	},
	{
		id: 'initial-4',
		shortTitle: 'Update CRM',
		description: 'Keep deal fields current automatically',
		builderPrompt: 'Build a CRM update workflow',
	},
];

const fallbackSuggestions = [
	{
		id: 'fallback-1',
		shortTitle: 'WhatsApp support agent',
		description: 'Reply to customer questions',
		builderPrompt: 'Build a WhatsApp support workflow',
	},
	{
		id: 'fallback-2',
		shortTitle: 'Process invoices',
		description: 'Extract and validate invoice details',
		builderPrompt: 'Build an invoice workflow',
	},
	{
		id: 'fallback-3',
		shortTitle: 'Schedule social posts',
		description: 'Create and schedule weekly posts',
		builderPrompt: 'Build a social scheduling workflow',
	},
	{
		id: 'fallback-4',
		shortTitle: 'Qualify inbound leads',
		description: 'Research and score new leads',
		builderPrompt: 'Build an inbound lead workflow',
	},
];

const renderComponent = createComponentRenderer(InstanceAiPersonalizedPromptSuggestions, {
	props: {
		suggestions,
		fallbackSuggestions,
		format: 'cards',
		disabled: false,
		showSeeMore: true,
	},
});

describe('InstanceAiPersonalizedPromptSuggestions', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders cards with titles and descriptions', () => {
		const { getByText } = renderComponent();

		expect(getByText('Qualify hot leads')).toBeVisible();
		expect(getByText('Score new form submissions and assign the best ones')).toBeVisible();
	});

	it('renders list rows with titles and descriptions', () => {
		const { getByText } = renderComponent({
			props: { format: 'list' },
		});

		expect(getByText('Qualify hot leads')).toBeVisible();
		expect(getByText('Score new form submissions and assign the best ones')).toBeVisible();
	});

	it('emits raw prompt insert payloads', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.click(getByTestId('instance-ai-personalized-suggestion-initial-2'));

		expect(emitted()['insert-suggestion']).toEqual([
			[
				{
					prompt: 'Build a follow-up workflow',
					suggestionId: 'initial-2',
					suggestionKind: 'prompt',
					position: 2,
					telemetryPayload: undefined,
				},
			],
		]);
	});

	it('emits preview changes immediately on hover and focus, then clears them', async () => {
		const { emitted, getByTestId } = renderComponent();
		const firstSuggestion = getByTestId('instance-ai-personalized-suggestion-initial-1');
		const secondSuggestion = getByTestId('instance-ai-personalized-suggestion-initial-2');

		await fireEvent.mouseEnter(firstSuggestion);
		expect(emitted()['preview-change']).toEqual([
			[{ prompt: 'Build a lead qualification workflow' }],
		]);

		await fireEvent.mouseLeave(firstSuggestion);
		await fireEvent.focus(secondSuggestion);
		await fireEvent.blur(secondSuggestion);

		expect(emitted()['preview-change']).toEqual([
			[{ prompt: 'Build a lead qualification workflow' }],
			[null],
			[{ prompt: 'Build a follow-up workflow' }],
			[null],
		]);
	});

	it('toggles See more to fallback suggestions and back to the original suggestions', async () => {
		const { emitted, getByTestId, queryByText } = renderComponent();

		await fireEvent.click(getByTestId('instance-ai-personalized-see-more'));

		expect(queryByText('Qualify hot leads')).not.toBeInTheDocument();
		expect(queryByText('WhatsApp support agent')).toBeVisible();
		expect(emitted()['cycle-suggestions']).toEqual([
			[
				{
					visibleSuggestionIds: ['fallback-1', 'fallback-2', 'fallback-3', 'fallback-4'],
					cycleCount: 1,
					telemetryPayload: { suggestion_source: 'v2_top_used_fallback' },
				},
			],
		]);

		await fireEvent.click(getByTestId('instance-ai-personalized-see-more'));

		expect(queryByText('Qualify hot leads')).toBeVisible();
		expect(queryByText('WhatsApp support agent')).not.toBeInTheDocument();
		expect(emitted()['cycle-suggestions']).toEqual([
			[
				{
					visibleSuggestionIds: ['fallback-1', 'fallback-2', 'fallback-3', 'fallback-4'],
					cycleCount: 1,
					telemetryPayload: { suggestion_source: 'v2_top_used_fallback' },
				},
			],
			[
				{
					visibleSuggestionIds: ['initial-1', 'initial-2', 'initial-3', 'initial-4'],
					cycleCount: 2,
					telemetryPayload: undefined,
				},
			],
		]);
	});

	it('emits fallback source telemetry when inserting a fallback suggestion', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.click(getByTestId('instance-ai-personalized-see-more'));
		await fireEvent.click(getByTestId('instance-ai-personalized-suggestion-fallback-1'));

		expect(emitted()['insert-suggestion']).toEqual([
			[
				{
					prompt: 'Build a WhatsApp support workflow',
					suggestionId: 'fallback-1',
					suggestionKind: 'prompt',
					position: 1,
					telemetryPayload: { suggestion_source: 'v2_top_used_fallback' },
				},
			],
		]);
	});

	it('does not render the See more CTA when disabled by props', () => {
		const { queryByTestId } = renderComponent({
			props: { showSeeMore: false },
		});

		expect(queryByTestId('instance-ai-personalized-see-more')).not.toBeInTheDocument();
	});
});
