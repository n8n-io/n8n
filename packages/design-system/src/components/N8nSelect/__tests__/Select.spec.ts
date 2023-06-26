import { defineComponent, ref } from 'vue';
import { render, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
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

		it('should select an option', async () => {
			const n8nSelectTestComponent = defineComponent({
				components: {
					N8nSelect,
					N8nOption,
				},
				template: `
					<n8n-select v-model="selected">
						<n8n-option v-for="o in options" :key="o" :value="o" :label="o" />
					</n8n-select>
				`,
				setup() {
					const options = ref(['1', '2', '3']);
					const selected = ref('');

					return {
						options,
						selected,
					};
				},
			});

			const { container, getByRole } = render(n8nSelectTestComponent);
			const getOption = (value: string) => within(container as HTMLElement).getByText(value);
			const textbox = getByRole('textbox');

			await userEvent.click(textbox);
			await waitFor(() => expect(getOption('1')).toBeVisible());
			await userEvent.click(getOption('1'));

			expect(textbox).toHaveValue('1');
		});
	});
});
