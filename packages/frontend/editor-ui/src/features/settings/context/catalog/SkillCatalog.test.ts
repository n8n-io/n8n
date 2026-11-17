import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import SkillCatalog from './SkillCatalog.vue';
import { SKILL_CATALOG } from './skillCatalog';

const renderCatalog = createComponentRenderer(SkillCatalog);

describe('SkillCatalog', () => {
	it('combines the purpose filter and search and explains empty results', async () => {
		const view = renderCatalog();
		await userEvent.click(view.getByTestId('skill-catalog-category'));
		await userEvent.click(await view.findByRole('option', { name: 'Write and plan content' }));
		expect(view.queryByTestId('skill-catalog-n8n-error-handling-official')).not.toBeInTheDocument();
		expect(
			view.getByTestId('skill-catalog-coreyhaines31/marketingskills/copywriting'),
		).toBeVisible();
		await userEvent.type(view.getByTestId('skill-catalog-search'), 'copywriting');
		expect(view.getAllByTestId('skill-catalog-details')).toHaveLength(1);
		await userEvent.type(view.getByTestId('skill-catalog-search'), ' no match');
		expect(view.getByTestId('skill-catalog-empty')).toHaveTextContent(/search|category/i);
	});

	it('opens the selected skill directly in the import flow', async () => {
		const view = renderCatalog();
		const entry = SKILL_CATALOG[0];
		await userEvent.click(
			within(view.getByTestId(`skill-catalog-${entry.id}`)).getByRole('button'),
		);
		expect(view.emitted('select')).toEqual([[entry]]);
		expect(view.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
