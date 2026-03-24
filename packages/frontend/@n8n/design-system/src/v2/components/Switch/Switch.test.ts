import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

import Switch from './Switch.vue';

describe('v2/components/Switch', () => {
	describe('rendering', () => {
		it('should render unchecked by default', () => {
			const wrapper = render(Switch);
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toHaveAttribute('data-state', 'unchecked');
		});

		it('should render with label text', () => {
			const wrapper = render(Switch, {
				props: {
					label: 'Enable feature',
				},
			});
			expect(wrapper.getByText('Enable feature')).toBeInTheDocument();
		});

		it('should render checked state', () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: true,
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toHaveAttribute('data-state', 'checked');
		});

		it('should render disabled state', () => {
			const wrapper = render(Switch, {
				props: {
					disabled: true,
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toHaveAttribute('data-disabled');
		});

		it('should render small size by default', () => {
			const wrapper = render(Switch);
			const container = wrapper.container.firstElementChild;
			expect(container?.className).toContain('small');
		});

		it('should render large size when specified', () => {
			const wrapper = render(Switch, {
				props: {
					size: 'large',
				},
			});
			const container = wrapper.container.firstElementChild;
			expect(container?.className).toContain('large');
		});
	});

	describe('v-model', () => {
		it('should update modelValue on click', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: false,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]');
			await userEvent.click(switchEl!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});

		it('should toggle from checked to unchecked', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: true,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]');
			await userEvent.click(switchEl!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
			});
		});

		it('should not update when disabled', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: false,
					disabled: true,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]');
			await userEvent.click(switchEl!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')).toBeFalsy();
			});
		});
	});

	describe('defaultValue', () => {
		it('should use defaultValue when provided', () => {
			const wrapper = render(Switch, {
				props: {
					defaultValue: true,
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toHaveAttribute('data-state', 'checked');
		});

		it('should allow toggling with defaultValue', async () => {
			const wrapper = render(Switch, {
				props: {
					defaultValue: true,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]');
			await userEvent.click(switchEl!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
			});
		});
	});

	describe('events', () => {
		it('should emit update:modelValue on click', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: false,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]');
			await userEvent.click(switchEl!);

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});
	});

	describe('label interaction', () => {
		it('should render switch with label', () => {
			const wrapper = render(Switch, {
				props: {
					label: 'Click me',
					modelValue: false,
				},
			});

			expect(wrapper.getByText('Click me')).toBeInTheDocument();
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toBeInTheDocument();
		});

		it('should show disabled state on label when disabled', () => {
			const wrapper = render(Switch, {
				props: {
					label: 'Click me',
					modelValue: false,
					disabled: true,
				},
			});

			const label = wrapper.container.querySelector('label');
			expect(label).toHaveAttribute('data-disabled');
		});
	});

	describe('slots', () => {
		it('should render label slot', () => {
			const wrapper = render(Switch, {
				props: {
					label: 'Default label',
				},
				slots: {
					label: '<span data-test-id="custom-label">Custom label content</span>',
				},
			});
			expect(wrapper.getByTestId('custom-label')).toBeInTheDocument();
			expect(wrapper.queryByText('Default label')).not.toBeInTheDocument();
		});

		it('should render label slot with scoped props', () => {
			const wrapper = render(Switch, {
				props: {
					label: 'Default label',
				},
				slots: {
					label: '<template #label="{ label }">Custom: {{ label }}</template>',
				},
			});
			expect(wrapper.getByText(/Custom:/)).toBeInTheDocument();
		});
	});

	describe('form integration', () => {
		it('should accept name prop', () => {
			const wrapper = render(Switch, {
				props: {
					name: 'toggle',
					value: 'enabled',
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toBeInTheDocument();
		});

		it('should accept required prop', () => {
			const wrapper = render(Switch, {
				props: {
					required: true,
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toHaveAttribute('aria-required', 'true');
		});
	});

	describe('accessibility', () => {
		it('should have proper ARIA role', () => {
			const wrapper = render(Switch);
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			expect(switchEl).toBeInTheDocument();
		});

		it('should associate label with switch using id', () => {
			const wrapper = render(Switch, {
				props: {
					id: 'test-switch',
					label: 'Test label',
				},
			});
			const switchEl = wrapper.container.querySelector('[role="switch"]');
			const label = wrapper.container.querySelector('label');
			expect(switchEl).toHaveAttribute('id', 'test-switch');
			expect(label).toHaveAttribute('for', 'test-switch');
		});

		it('should be keyboard accessible with Space', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: false,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]') as HTMLElement;
			switchEl?.focus();
			await userEvent.keyboard(' ');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});

		it('should be keyboard accessible with Enter', async () => {
			const wrapper = render(Switch, {
				props: {
					modelValue: false,
				},
			});

			const switchEl = wrapper.container.querySelector('[role="switch"]') as HTMLElement;
			switchEl?.focus();
			await userEvent.keyboard('{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
			});
		});
	});
});
