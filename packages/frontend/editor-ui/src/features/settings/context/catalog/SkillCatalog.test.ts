import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import SkillCatalog from './SkillCatalog.vue';
import { SKILL_CATALOG } from './skillCatalog';

const renderCatalog = createComponentRenderer(SkillCatalog, {
	props: { canCreate: true },
});

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

	it('shows requirements before handing a selected skill to the import flow', async () => {
		const view = renderCatalog();
		const entry = SKILL_CATALOG[0];
		await userEvent.click(
			within(view.getByTestId(`skill-catalog-${entry.id}`)).getByRole('button'),
		);
		const dialog = await view.findByRole('dialog');
		expect(within(dialog).getByText(/workflow tools/)).toBeInTheDocument();
		expect(within(dialog).getByRole('link')).toHaveAttribute('href', entry.url);
		await userEvent.click(within(dialog).getByTestId('skill-catalog-add'));
		expect(view.emitted('select')).toEqual([[entry]]);
	});

	it('allows browsing but prevents adding when no scope is writable', async () => {
		const view = renderCatalog({ props: { canCreate: false } });
		await userEvent.click(view.getAllByTestId('skill-catalog-details')[0]);
		expect(await view.findByTestId('skill-catalog-add')).toBeDisabled();
		expect(view.emitted('select')).toBeUndefined();
	});
});
