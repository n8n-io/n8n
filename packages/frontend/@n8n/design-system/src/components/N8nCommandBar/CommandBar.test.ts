import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nCommandBar from './CommandBar.vue';

const createSampleItems = () => [
	{ id: 'recent-1', title: 'Recent: Customer Sync', icon: { html: '📋' } },
	{ id: 'recent-2', title: 'Recent: Email Campaign', icon: { html: '✉️' } },

	{
		id: 'create',
		title: 'Create new workflow',
		icon: { html: '⚡' },
		section: 'Actions',
	},
	{
		id: 'import',
		title: 'Import workflow',
		icon: { html: '📥' },
		section: 'Actions',
		keywords: ['upload', 'file'],
	},

	{ id: 'workflows', title: 'All Workflows', icon: { html: '📁' }, section: 'Navigation' },
	{ id: 'executions', title: 'Executions', icon: { html: '🏃' }, section: 'Navigation' },

	{
		id: 'search-nodes',
		title: 'Search nodes',
		icon: { html: '🔍' },
		section: 'Tools',
		placeholder: 'Search nodes…',
		children: [
			{ id: 'node-http-request', title: 'HTTP Request' },
			{ id: 'node-set', title: 'Set' },
		],
		hasMoreChildren: true,
	},
];

async function openCommandBar() {
	const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
	document.dispatchEvent(ev);
	await waitFor(() => expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument());
}

describe('components', () => {
	describe('N8nCommandBar', () => {
		it('opens with Cmd/Ctrl+K and closes with Escape', async () => {
			const wrapper = render(N8nCommandBar, {
				props: { items: createSampleItems() },
			});

			await openCommandBar();

			const esc = new KeyboardEvent('keydown', { key: 'Escape' });
			document.dispatchEvent(esc);

			await waitFor(() =>
				expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument(),
			);
			// sanity: no leaks
			expect(wrapper.emitted()).toBeDefined();
		});

		it('emits inputChange and filters results as user types', async () => {
			const wrapper = render(N8nCommandBar, {
				props: { items: createSampleItems() },
			});

			await openCommandBar();
			const input = screen.getByPlaceholderText('Type a command...');

			await fireEvent.update(input, 'import');
			await nextTick();

			expect(screen.getByText('Import workflow')).toBeInTheDocument();
			expect(screen.queryByText('Create new workflow')).not.toBeInTheDocument();

			const events = wrapper.emitted('inputChange') ?? [];
			expect(events.length).toBeGreaterThan(0);
			expect(events[events.length - 1]).toEqual(['import']);
		});

		it('renders ungrouped items before section headers and items', async () => {
			render(N8nCommandBar, { props: { items: createSampleItems() } });
			await openCommandBar();

			const recent = screen.getByText('Recent: Customer Sync');
			const actionsHeader = screen.getByText('Actions');

			expect(recent.compareDocumentPosition(actionsHeader)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it('navigates into children on click and back with ArrowLeft', async () => {
			render(N8nCommandBar, { props: { items: createSampleItems() } });
			await openCommandBar();

			await fireEvent.click(screen.getByText('Search nodes'));

			await waitFor(() => expect(screen.getByPlaceholderText('Search nodes…')).toBeInTheDocument());

			expect(screen.getByText('HTTP Request')).toBeInTheDocument();

			const left = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
			document.dispatchEvent(left);

			await waitFor(() =>
				expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument(),
			);

			expect(screen.getByText('Search nodes')).toBeInTheDocument();
		});

		it('invokes item handler on selection and closes the command bar', async () => {
			const onCreate = vi.fn();
			const items = createSampleItems().map((it) =>
				it.id === 'create' ? { ...it, handler: onCreate } : it,
			);

			render(N8nCommandBar, { props: { items } });
			await openCommandBar();

			await fireEvent.click(screen.getByText('Create new workflow'));

			expect(onCreate).toHaveBeenCalledTimes(1);
			await waitFor(() =>
				expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument(),
			);
		});

		it('closes when clicking outside the command bar', async () => {
			render(N8nCommandBar, { props: { items: createSampleItems() } });
			await openCommandBar();

			await fireEvent.click(document.body);

			await waitFor(() =>
				expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument(),
			);
		});

		describe('loading state', () => {
			it('shows spinner only when isLoading is true', async () => {
				const { rerender } = render(N8nCommandBar, {
					props: { items: createSampleItems(), isLoading: false },
				});
				await openCommandBar();

				expect(screen.queryByTestId('command-bar-input-spinner')).not.toBeInTheDocument();

				await rerender({ items: createSampleItems(), isLoading: true });

				expect(screen.getByTestId('command-bar-input-spinner')).toBeInTheDocument();
			});

			it('shows loading items when isLoading is true', async () => {
				render(N8nCommandBar, {
					props: { items: [], isLoading: true },
				});
				await openCommandBar();

				expect(screen.getByTestId('command-bar-items-list')).toBeInTheDocument();
			});

			it('hides spinner when isLoading becomes false', async () => {
				const { rerender } = render(N8nCommandBar, {
					props: { items: createSampleItems(), isLoading: true },
				});
				await openCommandBar();

				expect(screen.getByTestId('command-bar-input-spinner')).toBeInTheDocument();

				await rerender({ items: createSampleItems(), isLoading: false });

				expect(screen.queryByTestId('command-bar-input-spinner')).not.toBeInTheDocument();
			});
		});

		describe('matchAnySearchTerm', () => {
			it('should match entire query string when matchAnySearchTerm is false', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Customer Data Sync',
						matchAnySearchTerm: false,
					},
					{
						id: 'workflow-2',
						title: 'Email Marketing Campaign',
						matchAnySearchTerm: false,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'customer data');
				await nextTick();

				expect(screen.getByText('Customer Data Sync')).toBeInTheDocument();
				expect(screen.queryByText('Email Marketing Campaign')).not.toBeInTheDocument();
			});

			it('should match any word when matchAnySearchTerm is true', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Customer Data Sync',
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-2',
						title: 'Email Marketing Campaign',
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-3',
						title: 'Sales Report Generator',
						matchAnySearchTerm: true,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'customer email');
				await nextTick();

				expect(screen.getByText('Customer Data Sync')).toBeInTheDocument();
				expect(screen.getByText('Email Marketing Campaign')).toBeInTheDocument();
				expect(screen.queryByText('Sales Report Generator')).not.toBeInTheDocument();
			});

			it('should match keywords with matchAnySearchTerm', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Data Processor',
						keywords: ['excel', 'spreadsheet', 'csv'],
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-2',
						title: 'Email Handler',
						keywords: ['gmail', 'outlook', 'mail'],
						matchAnySearchTerm: true,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'excel gmail');
				await nextTick();

				expect(screen.getByText('Data Processor')).toBeInTheDocument();
				expect(screen.getByText('Email Handler')).toBeInTheDocument();
			});

			it('should handle multiple spaces in search query', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Customer Sync',
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-2',
						title: 'Email Campaign',
						matchAnySearchTerm: true,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'customer  email   ');
				await nextTick();

				expect(screen.getByText('Customer Sync')).toBeInTheDocument();
				expect(screen.getByText('Email Campaign')).toBeInTheDocument();
			});

			it('should match single word with matchAnySearchTerm', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Customer Data Sync',
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-2',
						title: 'Email Marketing',
						matchAnySearchTerm: true,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'customer');
				await nextTick();

				expect(screen.getByText('Customer Data Sync')).toBeInTheDocument();
				expect(screen.queryByText('Email Marketing')).not.toBeInTheDocument();
			});

			it('should work with mixed matchAnySearchTerm settings', async () => {
				const items = [
					{
						id: 'workflow-1',
						title: 'Customer Data Sync',
						matchAnySearchTerm: true,
					},
					{
						id: 'workflow-2',
						title: 'Customer Email Setup',
						matchAnySearchTerm: false,
					},
				];

				render(N8nCommandBar, { props: { items } });
				await openCommandBar();

				const input = screen.getByPlaceholderText('Type a command...');

				await fireEvent.update(input, 'data email');
				await nextTick();

				expect(screen.getByText('Customer Data Sync')).toBeInTheDocument();
				expect(screen.queryByText('Customer Email Setup')).not.toBeInTheDocument();
			});
		});
	});
});
