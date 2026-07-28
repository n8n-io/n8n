import userEvent from '@testing-library/user-event';
import { render, waitFor, within } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
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

		// The wrapped element-plus instance is captured with a function ref and
		// handed out through a getter, because a string `ref` made vue-tsc refuse to
		// emit this component's declaration. These assert the exposed surface still
		// behaves like the plain ref it replaced — editor-ui reaches for
		// `innerSelect.handleClose()` and `.blur()` through it.
		describe('exposed API', () => {
			// Attached to the document so `focusOnInput` can be asserted against
			// `document.activeElement`. Tracked and torn down after each test —
			// leaving an attached wrapper mounted outlives the test environment and
			// surfaces as an unhandled `document is not defined` elsewhere in the run.
			let wrapper: ReturnType<typeof mount<typeof N8nSelect>> | undefined;

			const mountSelect = () => {
				wrapper = mount(N8nSelect, {
					attachTo: document.body,
					global: { components: { 'n8n-option': N8nOption } },
					slots: { default: '<n8n-option value="1">1</n8n-option>' },
				});
				return wrapper;
			};

			afterEach(() => {
				wrapper?.unmount();
				wrapper = undefined;
			});

			it('should expose the wrapped element-plus instance', () => {
				const wrapper = mountSelect();

				expect(wrapper.vm.innerSelect).toBeTruthy();
				expect(typeof wrapper.vm.innerSelect?.focus).toBe('function');
				expect(typeof wrapper.vm.innerSelect?.blur).toBe('function');
			});

			it('should delegate focus and blur to the wrapped instance', () => {
				const wrapper = mountSelect();
				const inner = wrapper.vm.innerSelect!;
				const focusSpy = vi.spyOn(inner, 'focus');
				const blurSpy = vi.spyOn(inner, 'blur');

				wrapper.vm.focus();
				expect(focusSpy).toHaveBeenCalledTimes(1);

				wrapper.vm.blur();
				expect(blurSpy).toHaveBeenCalledTimes(1);
			});

			it('should focus the inner input via focusOnInput', () => {
				const wrapper = mountSelect();

				wrapper.vm.focusOnInput();

				expect(wrapper.find('input').element).toBe(document.activeElement);
			});

			it('should clear the exposed instance on unmount', () => {
				const wrapper = mountSelect();
				expect(wrapper.vm.innerSelect).toBeTruthy();

				wrapper.unmount();

				expect(wrapper.vm.innerSelect).toBeNull();
			});
		});
	});
});
