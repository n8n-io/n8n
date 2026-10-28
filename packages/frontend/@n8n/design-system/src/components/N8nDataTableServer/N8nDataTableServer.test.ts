import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/vue';

import { PAGINATION_ALL_ITEMS_PER_PAGE } from '../N8nPagination';
import N8nDataTableServer, { type TableHeader } from './N8nDataTableServer.vue';
import { createComponentRenderer } from '../../__tests__/render';

const renderComponent = createComponentRenderer(N8nDataTableServer);

const getRenderedOptions = async () => {
	const dropdown = await waitFor(() => screen.getByRole('listbox'));
	expect(dropdown).toBeInTheDocument();
	return dropdown.querySelectorAll('[data-test-id="select-item"]');
};

const itemFactory = () => ({
	id: crypto.randomUUID() as string,
	firstName: crypto.randomUUID() as string,
	lastName: crypto.randomUUID() as string,
});
type Item = ReturnType<typeof itemFactory>;

const items: Item[] = [...Array(106).keys()].map(itemFactory);
const headers: Array<TableHeader<Item>> = [
	{
		title: 'Id',
		key: 'id',
	},
	{
		title: 'First name',
		key: 'firstName',
	},
	{
		title: 'Last name',
		value: 'lastName',
	},
	{
		title: 'Full name',
		key: 'fullName',
		value(item: Item) {
			return `${item.firstName}|${item.lastName}`;
		},
	},
	{
		title: 'Empty Column',
	},
];

describe('N8nDataTableServer', () => {
	it('should render a table', () => {
		const { container } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items, headers, itemsLength: items.length },
		});

		expect(container.querySelectorAll('thead tr').length).toEqual(1);
		expect(container.querySelectorAll('tbody tr').length).toEqual(items.length);
		expect(container.querySelectorAll('tbody tr td').length).toEqual(headers.length * items.length);
	});

	it('should render dynamic slots', () => {
		const slotName = 'item.id' as `item.${string}`;
		const { container } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items, headers, itemsLength: items.length },
			slots: {
				[slotName]: ({ item }: { item: Item }) => {
					return `🍌 ${item.id}`;
				},
			},
		});

		const rows = container.querySelectorAll('tbody tr');

		rows.forEach((tr, index) => {
			expect(tr.querySelector('td')?.textContent).toBe(`🍌 ${items[index].id}`);
		});
	});

	it('should synchronize the state', async () => {
		const { container, rerender } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items, headers, itemsLength: items.length },
		});

		expect(container.querySelector('tbody tr td')?.textContent).toBe(items[0].id);

		await rerender({
			items: [{ id: '1', firstName: '1', lastName: '1' }],
			headers,
			itemsLength: 1,
		});
		expect(container.querySelector('tbody tr td')?.textContent).toBe('1');
	});

	it('should emit options for sorting / pagination', async () => {
		const { container, emitted, getByTestId, findAllByRole } = renderComponent({
			props: { items, headers, itemsLength: 100 },
		});

		await userEvent.click(container.querySelector('thead tr th')!);
		await userEvent.click(container.querySelector('thead tr th')!);
		await userEvent.click(within(getByTestId('pagination')).getByText('2'));

		expect(emitted('update:options').length).toBe(3);
		expect(emitted('update:options')[0]).toStrictEqual([
			expect.objectContaining({ sortBy: [{ id: 'id', desc: false }] }),
		]);
		expect(emitted('update:options')[1]).toStrictEqual([
			expect.objectContaining({ sortBy: [{ id: 'id', desc: true }] }),
		]);

		// // change the page size select option
		const selectInput = await findAllByRole('combobox'); // Find the select input
		await userEvent.click(selectInput[0]);

		const options = await getRenderedOptions();
		expect(options.length).toBe(4);

		// account for the debounce
		await new Promise((r) => setTimeout(r, 100));

		const option50 = Array.from(options).find((option) => option.textContent === '50/page');
		await userEvent.click(option50!);

		expect(emitted('update:options').length).toBe(4);
		expect(emitted('update:options').at(-1)).toStrictEqual([
			expect.objectContaining({ page: 0, itemsPerPage: 50 }),
		]);
	});

	it('should emit options for sorting with initial sort', async () => {
		const { container, emitted } = renderComponent({
			props: { items, headers, itemsLength: 100, sortBy: [{ id: 'id', desc: true }] },
		});

		await userEvent.click(container.querySelector('thead tr th')!);
		await userEvent.click(container.querySelector('thead tr th')!);

		expect(emitted('update:options').length).toBe(2);
		expect(emitted('update:options')[0]).toStrictEqual([expect.objectContaining({ sortBy: [] })]);
		expect(emitted('update:options')[1]).toStrictEqual([
			expect.objectContaining({ sortBy: [{ id: 'id', desc: false }] }),
		]);
	});

	it('should not show the pagination if there are no items', async () => {
		const { queryByTestId } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: [], headers, itemsLength: 0 },
		});

		expect(queryByTestId('pagination')).not.toBeInTheDocument();
	});

	it('should not show the pagination if there are less items than the smallest page size value', async () => {
		const { queryByTestId } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: items.slice(0, 3), headers, itemsLength: 3 },
		});

		expect(queryByTestId('pagination')).not.toBeInTheDocument();
	});

	it('should sync external selection model changes into row checkboxes', async () => {
		const selectionItems = items.slice(0, 3);
		const { container, emitted, rerender } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: selectionItems, headers, itemsLength: 3, showSelect: true, selection: [] },
		});

		const rowCheckboxes = container.querySelectorAll<HTMLElement>('tbody [role="checkbox"]');
		expect(rowCheckboxes.length).toBe(3);

		await userEvent.click(rowCheckboxes[0]);

		expect(emitted('update:selection').at(-1)).toEqual([[selectionItems[0].id]]);
		expect(rowCheckboxes[0]).toHaveAttribute('aria-checked', 'true');

		// Clearing the model from the outside must uncheck the rows
		await rerender({ selection: [] });

		await waitFor(() => {
			expect(rowCheckboxes[0]).toHaveAttribute('aria-checked', 'false');
		});
	});

	it('should render one skeleton row per page size while the first page loads', () => {
		const { container } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: [], headers, itemsLength: 100, loading: true, itemsPerPage: 25 },
		});

		expect(container.querySelectorAll('tbody tr').length).toBe(25);
	});

	it('should render a bounded skeleton while All is loading', () => {
		const { container } = render(N8nDataTableServer, {
			props: {
				items: [],
				//@ts-expect-error testing-library errors due to header generics
				headers,
				itemsLength: 100,
				loading: true,
				itemsPerPage: PAGINATION_ALL_ITEMS_PER_PAGE,
				showAll: true,
			},
		});

		expect(container.querySelectorAll('tbody tr').length).toBe(10);
	});

	it('should return to the first page when the page size changes', async () => {
		const { emitted, findAllByRole } = renderComponent({
			props: { items, headers, itemsLength: 106, itemsPerPage: 50, page: 2 },
		});

		const selectInput = await findAllByRole('combobox');
		await userEvent.click(selectInput[0]);

		const options = await getRenderedOptions();
		expect(options.length).toBe(4);

		const option100 = Array.from(options).find((option) => option.textContent === '100/page');
		await userEvent.click(option100!);

		expect(emitted('update:options')).toEqual(
			expect.arrayContaining([
				expect.arrayContaining([expect.objectContaining({ page: 0, itemsPerPage: 100 })]),
			]),
		);
	});

	it('should pin the first column, and the selection column, when asked to', async () => {
		const { container, rerender } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: items.slice(0, 2), headers, itemsLength: 2, pinFirstColumn: true },
		});

		const headerCells = container.querySelectorAll('thead tr th');
		expect(headerCells[0]).toHaveClass('is-pinned');
		expect(headerCells[0]).toHaveStyle({ left: '0px' });
		expect(headerCells[1]).not.toHaveClass('is-pinned');

		const bodyCells = container.querySelectorAll('tbody tr:first-child td');
		expect(bodyCells[0]).toHaveClass('is-pinned');
		expect(bodyCells[1]).not.toHaveClass('is-pinned');

		await rerender({ showSelect: true });

		await waitFor(() => {
			const cells = container.querySelectorAll('tbody tr:first-child td');
			expect(cells[0]).toHaveClass('is-pinned');
			expect(cells[1]).toHaveClass('is-pinned');
			expect(cells[1]).toHaveStyle({ left: '38px' });
			expect(cells[2]).not.toHaveClass('is-pinned');
		});
	});

	it('should not pin any column by default', () => {
		const { container } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: items.slice(0, 2), headers, itemsLength: 2 },
		});

		expect(container.querySelector('.is-pinned')).toBeNull();
	});

	it('should hint at the edge that still hides columns while scrolling sideways', async () => {
		const { container } = render(N8nDataTableServer, {
			//@ts-expect-error testing-library errors due to header generics
			props: { items: items.slice(0, 2), headers, itemsLength: 2 },
		});

		const wrapper = container.querySelector('.n8n-data-table-server-wrapper')!;
		const scroller = container.querySelector<HTMLElement>('.table-scroll')!;

		// jsdom has no layout, so stand in for a table twice as wide as its container
		Object.defineProperty(scroller, 'scrollWidth', { value: 800, configurable: true });
		Object.defineProperty(scroller, 'clientWidth', { value: 400, configurable: true });
		let scrollLeft = 0;
		Object.defineProperty(scroller, 'scrollLeft', {
			get: () => scrollLeft,
			set: (value: number) => {
				scrollLeft = value;
			},
			configurable: true,
		});

		scroller.dispatchEvent(new Event('scroll'));
		await waitFor(() => {
			expect(wrapper).toHaveClass('can-scroll-right');
			expect(wrapper).not.toHaveClass('can-scroll-left');
		});

		scroller.scrollLeft = 200;
		scroller.dispatchEvent(new Event('scroll'));
		await waitFor(() => {
			expect(wrapper).toHaveClass('can-scroll-left');
			expect(wrapper).toHaveClass('can-scroll-right');
		});

		scroller.scrollLeft = 400;
		scroller.dispatchEvent(new Event('scroll'));
		await waitFor(() => {
			expect(wrapper).toHaveClass('can-scroll-left');
			expect(wrapper).not.toHaveClass('can-scroll-right');
		});
	});

	it('should emit all items per page when All is selected', async () => {
		const { emitted, findAllByRole } = renderComponent({
			props: { items, headers, itemsLength: 106, showAll: true },
		});

		const selectInput = await findAllByRole('combobox');
		await userEvent.click(selectInput[0]);

		const options = await getRenderedOptions();
		const allOption = Array.from(options).find((option) => option.textContent === 'All');
		await userEvent.click(allOption!);

		expect(emitted('update:options').at(-1)).toStrictEqual([
			expect.objectContaining({ itemsPerPage: PAGINATION_ALL_ITEMS_PER_PAGE }),
		]);
	});
});
