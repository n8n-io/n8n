import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';

import N8nCommandBar from './CommandBar.vue';
import type { CommandBarItem, CommandBarSection, CommandBarTab } from './types';

const workflowItem: CommandBarItem = {
	id: 'workflow-1',
	title: 'Sync leads',
	description: 'Sales',
	href: '/workflow/1',
};

const sections: CommandBarSection[] = [
	{
		id: 'recent',
		title: 'Recent',
		items: [workflowItem, { id: 'workflow-2', title: 'Archive invoices' }],
	},
	{
		id: 'actions',
		title: 'Actions',
		items: [
			{ id: 'locked', title: 'Locked node', disabled: true },
			{ id: 'settings', title: 'Settings' },
		],
	},
];

const tabs: CommandBarTab[] = [
	{ id: 'all', label: 'All' },
	{ id: 'workflows', label: 'Workflows' },
	{ id: 'actions', label: 'Actions' },
];

async function renderCommandBar(props: Record<string, unknown> = {}) {
	const wrapper = render(N8nCommandBar, {
		props: { open: true, sections, tabs, activeTab: 'all', ...props },
	});
	await screen.findByTestId('command-bar');
	return wrapper;
}

const getInput = () => screen.getByRole('combobox');

const getSelectedTitle = () =>
	screen
		.getAllByRole('option')
		.find((option) => option.getAttribute('aria-selected') === 'true')
		?.textContent?.trim();

describe('N8nCommandBar', () => {
	it('opens with Cmd+K', async () => {
		const wrapper = render(N8nCommandBar, { props: { sections } });

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

		await waitFor(() => expect(screen.getByTestId('command-bar')).toBeInTheDocument());
		expect(wrapper.emitted('update:open')).toEqual([[true]]);
	});

	it('requests to close on Escape', async () => {
		const wrapper = await renderCommandBar();

		await fireEvent.keyDown(getInput(), { key: 'Escape' });

		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('renders section headers before their items', async () => {
		await renderCommandBar();

		const header = screen.getByText('Actions', { selector: '[role="presentation"]' });
		const item = screen.getByText('Settings');

		expect(header.compareDocumentPosition(item)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(screen.getByText('Recent')).toBeInTheDocument();
	});

	it('shows skeleton rows for a loading section without items', async () => {
		await renderCommandBar({
			sections: [{ id: 'workflows', title: 'Workflows', items: [], isLoading: true }],
		});

		expect(
			screen.getByText('Workflows', { selector: '[role="presentation"]' }),
		).toBeInTheDocument();
		expect(screen.getAllByTestId('command-bar-skeleton')).toHaveLength(2);
		expect(screen.queryByTestId('command-bar-empty')).not.toBeInTheDocument();
	});

	it('moves the selection with the arrow keys and selects with Enter', async () => {
		const wrapper = await renderCommandBar();
		const input = getInput();

		expect(getSelectedTitle()).toContain('Sync leads');

		await fireEvent.keyDown(input, { key: 'ArrowDown' });
		expect(getSelectedTitle()).toContain('Archive invoices');

		await fireEvent.keyDown(input, { key: 'ArrowUp' });
		await fireEvent.keyDown(input, { key: 'ArrowUp' });
		expect(getSelectedTitle()).toContain('Sync leads');

		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(wrapper.emitted('select')).toEqual([[workflowItem, { newTab: false }]]);
	});

	it('selects with a new tab on Cmd+Enter', async () => {
		const wrapper = await renderCommandBar();

		await fireEvent.keyDown(getInput(), { key: 'Enter', metaKey: true });

		expect(wrapper.emitted('select')).toEqual([[workflowItem, { newTab: true }]]);
	});

	it('does not select disabled items', async () => {
		const wrapper = await renderCommandBar();

		await fireEvent.click(screen.getByText('Locked node'));

		expect(wrapper.emitted('select')).toBeUndefined();
	});

	it('selects an item on click', async () => {
		const wrapper = await renderCommandBar();

		await fireEvent.click(screen.getByText('Settings'));

		expect(wrapper.emitted('select')).toEqual([
			[{ id: 'settings', title: 'Settings' }, { newTab: false }],
		]);
	});

	it('highlights the query in item titles', async () => {
		await renderCommandBar({ query: 'lead' });

		expect(screen.getByText('lead', { selector: 'mark' })).toBeInTheDocument();
	});

	it('switches tabs on click, Tab and the arrow keys at the caret edges', async () => {
		const wrapper = await renderCommandBar();
		const input = getInput();

		await fireEvent.click(screen.getByTestId('command-bar-tab-workflows'));
		await fireEvent.keyDown(input, { key: 'Tab' });
		await fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
		await fireEvent.keyDown(input, { key: 'ArrowRight' });
		await fireEvent.keyDown(input, { key: 'ArrowLeft' });

		expect(wrapper.emitted('update:activeTab')).toEqual([
			['workflows'],
			['actions'],
			['workflows'],
			['actions'],
			['workflows'],
		]);
	});

	it('shows a breadcrumb and goes back with Backspace, Escape and the breadcrumb button', async () => {
		const wrapper = await renderCommandBar({ breadcrumb: 'Sync leads' });
		const input = getInput();

		expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

		await fireEvent.keyDown(input, { key: 'Backspace' });
		await fireEvent.keyDown(input, { key: 'Escape' });
		await fireEvent.click(screen.getByTestId('command-bar-breadcrumb'));

		expect(wrapper.emitted('back')).toHaveLength(3);
		expect(wrapper.emitted('update:open')).toBeUndefined();
	});

	it('offers to search all types when a type tab has no results', async () => {
		const wrapper = await renderCommandBar({ sections: [], activeTab: 'workflows' });

		const empty = screen.getByTestId('command-bar-empty');
		expect(within(empty).getByText('No results in Workflows')).toBeInTheDocument();

		await fireEvent.click(screen.getByTestId('command-bar-search-all'));

		expect(wrapper.emitted('update:activeTab')).toEqual([['all']]);
	});

	it('shows the new tab hint only for items with a link', async () => {
		await renderCommandBar();

		expect(screen.getByText('Open in new tab')).toBeInTheDocument();

		await fireEvent.keyDown(getInput(), { key: 'ArrowDown' });

		expect(screen.queryByText('Open in new tab')).not.toBeInTheDocument();
	});

	it('requests more results when the list end is visible', async () => {
		const wrapper = await renderCommandBar({ hasMore: true });

		await fireEvent.scroll(screen.getByTestId('command-bar-items-list'));

		expect(wrapper.emitted('loadMore')).toHaveLength(1);
	});
});
