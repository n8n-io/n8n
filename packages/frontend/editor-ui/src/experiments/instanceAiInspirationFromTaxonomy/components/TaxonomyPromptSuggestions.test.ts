// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

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

describe('TaxonomyPromptSuggestions', () => {
	it('renders the sales and marketing heading and one row per suggestion', () => {
		const { getByText, getAllByRole, queryByText } = render();

		expect(getByText('For sales and marketing')).toBeVisible();
		expect(getByText('For everyone')).toBeVisible();
		expect(getAllByRole('button')).toHaveLength(6);
		expect(getByText('Weekly report on my ads and website, with what changed')).toBeVisible();
		expect(getByText('Morning brief of the news and updates I care about')).toBeVisible();
		expect(getByText('Pull invoices from my email into a sheet, with due reminders')).toBeVisible();
		expect(queryByText('Every Monday at 9:00')).not.toBeInTheDocument();
	});

	it('inserts the clicked suggestion prompt', async () => {
		const { getByRole, emitted } = render();

		await fireEvent.click(
			getByRole('button', { name: /Weekly report on my ads and website, with what changed/ }),
		);

		expect(emitted()['insert-suggestion']).toEqual([
			[
				expect.objectContaining({
					suggestionId: 'v6-taxonomy-sales-and-marketing-1-weekly-ads-and-website-report',
					suggestionKind: 'prompt',
					suggestionTitle: 'Weekly report on my ads and website, with what changed',
					position: 1,
					prefillType: 'suggestion_catalog',
				}),
			],
		]);
	});
});
