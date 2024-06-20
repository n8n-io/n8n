import { render } from '@testing-library/vue';
import N8nDatatable from '../Datatable.vue';
import { rows, columns } from './data';

const stubs = [
	'n8n-option',
	'n8n-button',
	// Ideally we'd like to stub N8nSelect & N8nPagination, but it doesn't work
	// after migrating to setup script:
	// https://github.com/vuejs/vue-test-utils/issues/2048
	// 'n8n-select',
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
	});
});
