import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import N8nToggle from './Toggle.vue';
import N8nToggleGroup from '../N8nToggleGroup/ToggleGroup.vue';

const tooltipStub = {
	template: '<span data-test-id="tooltip" :data-content="content"><slot /></span>',
	props: ['content'],
};

describe('components/N8nToggle', () => {
	it('renders an icon-only button with the label as accessible name and tooltip content', () => {
		const wrapper = render(N8nToggle, {
			props: { label: 'Bold', icon: 'text' },
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Bold' });
		expect(toggle).toBeInTheDocument();
		expect(toggle.className).toContain('iconOnly');
		expect(wrapper.getByTestId('tooltip')).toHaveAttribute('data-content', 'Bold');
	});

	it.each(['solid', 'subtle', 'ghost', 'outline', 'destructive', 'success'] as const)(
		'renders %s variant like N8nButton',
		(variant) => {
			const wrapper = render(N8nToggle, {
				props: { label: 'Align left', icon: 'align-right', variant },
				global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
			});

			expect(wrapper.getByRole('button').className).toContain(variant);
		},
	);

	it.each(['xsmall', 'small', 'medium', 'large', 'xlarge'] as const)(
		'renders %s size like N8nButton',
		(size) => {
			const wrapper = render(N8nToggle, {
				props: { label: 'Align left', icon: 'align-right', size },
				global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
			});

			expect(wrapper.getByRole('button').className).toContain(size);
		},
	);

	it('supports controlled pressed state', async () => {
		const onUpdate = vi.fn();
		const wrapper = render(N8nToggle, {
			props: { label: 'Italic', modelValue: false, 'onUpdate:modelValue': onUpdate },
			slots: { default: '<span>I</span>' },
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Italic' });
		await userEvent.click(toggle);

		expect(onUpdate).toHaveBeenCalledWith(true);
		expect(toggle).toHaveAttribute('data-state', 'off');
	});

	it('renders pressed state from modelValue', () => {
		const wrapper = render(N8nToggle, {
			props: { label: 'Underline', modelValue: true },
			slots: { default: '<span>U</span>' },
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		expect(wrapper.getByRole('button')).toHaveAttribute('data-state', 'on');
	});

	it('can be used inside N8nToggleGroup as a single-selection item', async () => {
		const TestComponent = defineComponent({
			components: { N8nToggleGroup, N8nToggle },
			setup() {
				const value = ref('left');
				return { value };
			},
			template: `
				<N8nToggleGroup v-model="value">
					<N8nToggle value="left" label="Align left">L</N8nToggle>
					<N8nToggle value="center" label="Align center">C</N8nToggle>
				</N8nToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		expect(wrapper.getByRole('button', { name: 'Align left' })).toHaveAttribute('data-state', 'on');

		await userEvent.click(wrapper.getByRole('button', { name: 'Align center' }));

		expect(wrapper.getByRole('button', { name: 'Align center' })).toHaveAttribute(
			'data-state',
			'on',
		);
	});

	it('can be used inside N8nToggleGroup as a multiple-selection item', async () => {
		const TestComponent = defineComponent({
			components: { N8nToggleGroup, N8nToggle },
			setup() {
				const value = ref(['bold']);
				return { value };
			},
			template: `
				<N8nToggleGroup v-model="value" type="multiple">
					<N8nToggle value="bold" label="Bold">B</N8nToggle>
					<N8nToggle value="italic" label="Italic">I</N8nToggle>
				</N8nToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		await userEvent.click(wrapper.getByRole('button', { name: 'Italic' }));

		expect(wrapper.getByRole('button', { name: 'Bold' })).toHaveAttribute('data-state', 'on');
		expect(wrapper.getByRole('button', { name: 'Italic' })).toHaveAttribute('data-state', 'on');
	});

	it('does not emit updates when disabled', async () => {
		const onUpdate = vi.fn();
		const wrapper = render(N8nToggle, {
			props: { label: 'Disabled', disabled: true, 'onUpdate:modelValue': onUpdate },
			slots: { default: '<span>D</span>' },
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		const toggle = wrapper.getByRole('button', { name: 'Disabled' });
		expect(toggle).toBeDisabled();

		await userEvent.click(toggle);
		expect(onUpdate).not.toHaveBeenCalled();
	});

	it('passes disabled state from N8nToggleGroup slot props to child toggles', () => {
		const TestComponent = defineComponent({
			components: { N8nToggleGroup, N8nToggle },
			template: `
				<N8nToggleGroup disabled>
					<template #default="slotProps">
						<N8nToggle value="left" label="Align left" v-bind="slotProps">L</N8nToggle>
					</template>
				</N8nToggleGroup>
			`,
		});

		const wrapper = render(TestComponent, {
			global: { stubs: { N8nTooltip: tooltipStub, N8nIcon: true } },
		});

		expect(wrapper.getByRole('button', { name: 'Align left' })).toBeDisabled();
	});
});
