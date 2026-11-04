import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import { PAGINATION_ALL_ITEMS_PER_PAGE } from '../N8nPagination';
import { removeDynamicAttributes } from '../../utils';
import { rows, columns } from './__tests__/data';
import N8nDatatable from './Datatable.vue';

const stubs = [
	'N8nButton',
	// Ideally we'd like to stub N8nPagination, but it doesn't work
	// after migrating to setup script:
	// https://github.com/vuejs/vue-test-utils/issues/2048
	// 'n8n-pagination',
];

describe('components', () => {
	describe('N8nDatatable', () => {
		const rowsPerPage = 10;

		it('should render correctly', () => {
			const wrapper = render(N8nDatatable, {
				props: {
					columns,
					rows,
					rowsPerPage,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelectorAll('thead tr').length).toEqual(1);
			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(rowsPerPage);
			expect(wrapper.container.querySelectorAll('tbody tr td').length).toEqual(
				columns.length * rowsPerPage,
			);
			removeDynamicAttributes(wrapper.container);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should add column classes', () => {
			const wrapper = render(N8nDatatable, {
				props: {
					columns: columns.map((column) => ({ ...column, classes: ['example'] })),
					rows,
					rowsPerPage,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelectorAll('.example').length).toEqual(
				columns.length * (rowsPerPage + 1),
			);
		});

		it('should render row slot', () => {
			const wrapper = render(N8nDatatable, {
				props: {
					columns,
					rows,
					rowsPerPage,
				},
				global: {
					stubs,
				},
				slots: {
					row: '<template #row="props"><td v-for="column in props.columns" :key="column.id">Row slot</td></template>', // Wrapper is necessary for looping
				},
			});

			expect(wrapper.container.querySelectorAll('tbody td').length).toEqual(
				columns.length * rowsPerPage,
			);
			expect(wrapper.container.querySelector('tbody td')?.textContent).toEqual('Row slot');
		});

		it('should use the default pagination control', () => {
			const wrapper = render(N8nDatatable, {
				props: { columns, rows, rowsPerPage },
				global: { stubs },
			});

			expect(wrapper.getByTestId('pagination')).toBeInTheDocument();
			expect(wrapper.getByTestId('pagination-sizes')).toBeInTheDocument();
			expect(wrapper.container.querySelector('.pageSizeSelector')).toBeNull();
		});

		it('should render every row when rowsPerPage is All', () => {
			const wrapper = render(N8nDatatable, {
				props: { columns, rows, rowsPerPage: PAGINATION_ALL_ITEMS_PER_PAGE },
				global: { stubs },
			});

			expect(wrapper.getByRole('combobox')).toHaveTextContent('All');
			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(rows.length);
		});

		it('should select All from a later page and show every row', async () => {
			const currentPage = 2;
			const wrapper = render(N8nDatatable, {
				props: { columns, rows, rowsPerPage, currentPage },
				global: { stubs },
			});

			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(
				rows.length - rowsPerPage,
			);

			await userEvent.click(wrapper.getByRole('combobox'));

			await waitFor(async () => {
				await userEvent.click(wrapper.getByRole('option', { name: 'All' }));
			});

			await waitFor(() => {
				expect(wrapper.emitted('update:rowsPerPage')?.[0]).toEqual([PAGINATION_ALL_ITEMS_PER_PAGE]);
				expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([1]);
			});

			await wrapper.rerender({
				columns,
				rows,
				rowsPerPage: PAGINATION_ALL_ITEMS_PER_PAGE,
				currentPage: 1,
			});

			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(rows.length);
		});

		it('should render every row and hide pagination when pagination is disabled', () => {
			const wrapper = render(N8nDatatable, {
				props: { columns, rows, pagination: false },
				global: { stubs },
			});

			expect(wrapper.queryByTestId('pagination')).not.toBeInTheDocument();
			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(rows.length);
		});
	});
});
