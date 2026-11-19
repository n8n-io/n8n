// Experiment cleanup (142_aia_inspiration_from_taxonomy_v3)
import { fireEvent } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import { INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS } from '../prompts';
import TaxonomyPromptSuggestions from './TaxonomyPromptSuggestions.vue';

const suggestions = INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS.map(
	({ id, shortTitle, description, builderPrompt, section }) => ({
		id,
		shortTitle,
		description,
		builderPrompt,
		section,
	}),
);

const render = createComponentRenderer(TaxonomyPromptSuggestions, {
	props: { suggestions, disabled: false },
});

const roleTitles = [
	'AI chatbot that answers messages, qualifies leads and books calls',
	'Find and research leads that fit my ideal customer',
	'Save form leads to a Google Sheet, email them and alert me',
	'Keep my CRM updated without manual entry',
];

describe('TaxonomyPromptSuggestions', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the sales and marketing heading and one row per suggestion', () => {
		const { getByText, getAllByRole, queryByText } = render();

		expect(getByText('For sales and marketing')).toBeVisible();
		expect(getByText('For everyone')).toBeVisible();
		expect(getAllByRole('button')).toHaveLength(6);
		expect(
			getByText('AI chatbot that answers messages, qualifies leads and books calls'),
		).toBeVisible();
		expect(getByText('Turn requests in emails and messages into tasks')).toBeVisible();
		expect(getByText('Meeting summaries and action items, sent to me')).toBeVisible();
		expect(queryByText('Every Monday at 9:00')).not.toBeInTheDocument();
	});

	it('shuffles each section once and keeps the two headings separate', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const { getAllByRole, rerender } = render();
		const labels = () => getAllByRole('button').map((button) => button.textContent);

		expect(labels().slice(0, 4)).toEqual([
			'Find and research leads that fit my ideal customer',
			'Save form leads to a Google Sheet, email them and alert me',
			'Keep my CRM updated without manual entry',
			'AI chatbot that answers messages, qualifies leads and books calls',
		]);
		expect(labels().slice(4)).toEqual([
			'Meeting summaries and action items, sent to me',
			'Turn requests in emails and messages into tasks',
		]);
		expect(labels().slice(0, 4).sort()).toEqual([...roleTitles].sort());

		vi.spyOn(Math, 'random').mockReturnValue(0.99);
		return rerender({ suggestions, disabled: false }).then(() => {
			expect(labels().slice(4)).toEqual([
				'Meeting summaries and action items, sent to me',
				'Turn requests in emails and messages into tasks',
			]);
		});
	});

	it('inserts the clicked suggestion prompt at its displayed position', async () => {
		const { getAllByRole, emitted } = render();
		const buttons = getAllByRole('button');
		const index = buttons.findIndex((button) =>
			button.textContent?.includes('Keep my CRM updated without manual entry'),
		);

		await fireEvent.click(buttons[index]!);

		expect(emitted()['insert-suggestion']).toEqual([
			[
				expect.objectContaining({
					suggestionId: 'v6-taxonomy-sales-and-marketing-2-keep-crm-updated',
					suggestionKind: 'prompt',
					suggestionTitle: 'Keep my CRM updated without manual entry',
					position: index + 1,
					prefillType: 'suggestion_catalog',
				}),
			],
		]);
	});
});
