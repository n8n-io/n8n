import { render } from '@testing-library/vue';
import N8nSelect from '../Select.vue';
import N8nOption from '../../N8nOption/Option.vue';

describe('components', () => {
	describe('N8nSelect', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nSelect, {
				components: {
					N8nOption,
				},
				slots: {
					default: [
						'<n8n-option value="1">1</n8n-option>',
						'<n8n-option value="2">2</n8n-option>',
						'<n8n-option value="3">3</n8n-option>',
					],
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
