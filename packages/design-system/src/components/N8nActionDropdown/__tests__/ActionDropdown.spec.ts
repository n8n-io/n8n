import { render } from '@testing-library/vue';
import N8nActionDropdown from '../ActionDropdown.vue';

describe('components', () => {
	describe('N8nActionDropdown', () => {
		it('should render default styling correctly', () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'item1',
							label: 'Action 1',
						},
						{
							id: 'item2',
							label: 'Action 2',
						},
					],
				},
				stubs: ['n8n-icon', 'el-dropdown', 'el-dropdown-menu', 'el-dropdown-item'],
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
		it('should render custom styling correctly', () => {
			const wrapper = render(N8nActionDropdown, {
				props: {
					items: [
						{
							id: 'item1',
							label: 'Action 1',
							icon: 'thumbs-up',
						},
						{
							id: 'item2',
							label: 'Action 2',
							icon: 'thumbs-down',
							disabled: true,
						},
						{
							id: 'item3',
							label: 'Action 3',
							icon: 'heart',
							divided: true,
						},
					],
				},
				stubs: ['n8n-icon', 'el-dropdown', 'el-dropdown-menu', 'el-dropdown-item'],
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
