import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import { removeDynamicAttributes } from '@n8n/design-system/utils';

import N8nSelect from './Select.vue';
import N8nOption from '../N8nOption/Option.vue';

describe('components', () => {
	describe('N8nSelect', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nSelect, {
				global: {
					components: {
						'n8n-option': N8nOption,
					},
				},
				slots: {
					default: [
						'<n8n-option value="1">1</n8n-option>',
						'<n8n-option value="2">2</n8n-option>',
						'<n8n-option value="3">3</n8n-option>',
					],
				},
			});
			removeDynamicAttributes(wrapper.container);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should select an option', async () => {
			const n8nSelectTestComponent = defineComponent({
				props: {
					teleported: Boolean,
				},
				setup() {
					const options = ref(['1', '2', '3']);
					const selected = ref('');

					return {
						options,
						selected,
					};
				},
				template: `
					<n8n-select v-model="selected" :teleported="teleported">
						<n8n-option v-for="o in options" :key="o" :value="o" :label="o" />
					</n8n-select>
				`,
			});

			const { container } = render(n8nSelectTestComponent, {
				props: {
					teleported: false,
				},
				global: {
					components: {
						'n8n-select': N8nSelect,
						'n8n-option': N8nOption,
					},
				},
			});
			const getOption = (value: string) => within(container as HTMLElement).getByText(value);

			const textbox = container.querySelector('input')!;
			await userEvent.click(textbox);
			await waitFor(() => expect(getOption('1')).toBeVisible());
			await userEvent.click(getOption('1'));

			expect(textbox).toHaveValue('1');
		});
	});
});
