// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
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
	'Weekly report on my ads and website, with what changed',
	'Keep my CRM updated without manual entry',
	'AI chatbot that answers messages, qualifies leads and books calls',
	'Schedule LinkedIn posts in my voice, after my approval',
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
		expect(getByText('Weekly report on my ads and website, with what changed')).toBeVisible();
		expect(getByText('Morning brief from Slack, Gmail and the news')).toBeVisible();
		expect(getByText('Pull invoices from my email into a sheet, with due reminders')).toBeVisible();
		expect(queryByText('Every Monday at 9:00')).not.toBeInTheDocument();
	});

	it('shuffles the sales and marketing rows and keeps For everyone in catalog order', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const { getAllByRole } = render();
		const labels = getAllByRole('button').map((button) => button.textContent);

		expect(labels.slice(0, 4)).toEqual([
			'Keep my CRM updated without manual entry',
			'AI chatbot that answers messages, qualifies leads and books calls',
			'Schedule LinkedIn posts in my voice, after my approval',
			'Weekly report on my ads and website, with what changed',
		]);
		expect(labels.slice(4)).toEqual([
			'Morning brief from Slack, Gmail and the news',
			'Pull invoices from my email into a sheet, with due reminders',
		]);
		expect(labels.slice(0, 4).sort()).toEqual([...roleTitles].sort());
	});

	it('inserts the clicked suggestion prompt at its displayed position', async () => {
		const { getAllByRole, emitted } = render();
		const buttons = getAllByRole('button');
		const index = buttons.findIndex((button) =>
			button.textContent?.includes('Weekly report on my ads and website, with what changed'),
		);

		await fireEvent.click(buttons[index]!);

		expect(emitted()['insert-suggestion']).toEqual([
			[
				expect.objectContaining({
					suggestionId: 'v6-taxonomy-sales-and-marketing-1-weekly-ads-and-website-report',
					suggestionKind: 'prompt',
					suggestionTitle: 'Weekly report on my ads and website, with what changed',
					position: index + 1,
					prefillType: 'suggestion_catalog',
				}),
			],
		]);
	});
});
