import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/vue';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nDataTableServer, { type TableHeader } from './N8nDataTableServer.vue';

const renderComponent = createComponentRenderer(N8nDataTableServer);

const getRenderedOptions = async () => {
	const dropdown = await waitFor(() => screen.getByRole('listbox'));
	expect(dropdown).toBeInTheDocument();
	return dropdown.querySelectorAll('.el-select-dropdown__item');
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
		await userEvent.click(within(getByTestId('pagination')).getByLabelText('page 2'));

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

		const option50 = Array.from(options).find((option) => option.textContent === '50');
		await userEvent.click(option50!);

		expect(emitted('update:options').length).toBe(4);
		expect(emitted('update:options').at(-1)).toStrictEqual([
			expect.objectContaining({ page: 1, itemsPerPage: 50 }),
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

	it('should adjust page to highest available when page size changes and current page exceeds maximum', async () => {
		const { emitted, findAllByRole } = renderComponent({
			props: { items, headers, itemsLength: 106, itemsPerPage: 50, page: 2 },
		});

		// change the page size select option
		const selectInput = await findAllByRole('combobox'); // Find the select input
		await userEvent.click(selectInput[0]);

		const options = await getRenderedOptions();
		expect(options.length).toBe(4);

		const option100 = Array.from(options).find((option) => option.textContent === '100');
		await userEvent.click(option100!);

		// With 106 items and 50 per page, max page should be 2 (0-based index 1)
		// Since we were on page 2, we should be adjusted to page 1
		expect(emitted('update:options')).toEqual(
			expect.arrayContaining([
				expect.arrayContaining([expect.objectContaining({ page: 1, itemsPerPage: 100 })]),
			]),
		);
	});
});
