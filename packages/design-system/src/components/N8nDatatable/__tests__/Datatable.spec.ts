import { render } from '@testing-library/vue';
import N8nDatatable from '../Datatable.vue';
import { rows, columns } from './data';

const stubs = ['n8n-select', 'n8n-option', 'n8n-button', 'n8n-pagination'];

describe('components', () => {
	describe('N8nDatatable', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nDatatable, {
				propsData: {
					columns,
					rows,
				},
				stubs,
			});

			expect(wrapper.container.querySelectorAll('tbody tr').length).toEqual(10);
			expect(wrapper.container.querySelectorAll('thead tr').length).toEqual(1);
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
