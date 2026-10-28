import { fireEvent, render } from '@testing-library/vue';
import { defineComponent, ref } from 'vue';

import type { SliderProps } from './Slider.types';
import Slider from './Slider.vue';
import type { InputSize } from '../../types/input';

describe('components/N8nSlider', () => {
	it('uses the large size by default', () => {
		const wrapper = render(Slider, { props: { label: 'Volume' } });

		expect(wrapper.container.firstElementChild).toHaveClass('large');
	});

	it.each<InputSize>(['mini', 'small', 'medium', 'large', 'xlarge'])(
		'applies the %s size',
		(size) => {
			const wrapper = render(Slider, { props: { label: 'Volume', size } });

			expect(wrapper.container.firstElementChild).toHaveClass(size);
			expect(wrapper.container.firstElementChild).not.toHaveAttribute('size');
		},
	);

	it('renders the supplied label', () => {
		const wrapper = render(Slider, { props: { label: 'Volume' } });

		expect(wrapper.getByText('Volume')).toBeInTheDocument();
	});

	it('hides the visible label when requested', () => {
		const wrapper = render(Slider, { props: { label: 'Volume', hideLabel: true } });

		const label = wrapper.getByText('Volume');

		expect(label).toHaveClass('hiddenLabel');
		expect(label).not.toHaveAttribute('aria-hidden');
		expect(label).not.toHaveAttribute('hidden');
		expect(wrapper.getByRole('slider', { name: 'Volume' })).toHaveAttribute(
			'aria-labelledby',
			label.id,
		);
	});

	it('uses custom label content as the accessible name', () => {
		const wrapper = render(Slider, {
			props: { label: 'Fallback' },
			slots: { label: '<span>Custom volume</span>' },
		});

		expect(wrapper.getByRole('slider', { name: 'Custom volume' })).toBeInTheDocument();
		expect(wrapper.queryByText('Fallback')).not.toBeInTheDocument();
	});

	it.each<SliderProps>([{}, { label: ' ' }, { ariaLabel: ' ' }, { ariaLabelledby: ' ' }])(
		'updates the accessible name after mounting without a naming source: %j',
		async (props) => {
			const wrapper = render(Slider, { props });
			const control = wrapper.getByRole('slider');

			expect(control).not.toHaveAccessibleName();
			await wrapper.rerender({ label: 'Volume', ariaLabel: undefined, ariaLabelledby: undefined });

			expect(wrapper.getByRole('slider', { name: 'Volume' })).toBe(control);
		},
	);

	it('uses a label slot without a label prop', () => {
		const wrapper = render(Slider, { slots: { label: '<span>Volume</span>' } });

		expect(wrapper.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
	});

	it('updates the label and naming reference when a label slot changes', async () => {
		const showLabel = ref(false);
		const parent = defineComponent({
			components: { Slider },
			setup() {
				return { showLabel };
			},
			template: `
				<button @click="showLabel = !showLabel">Toggle label</button>
				<Slider :aria-label="showLabel ? undefined : 'Volume'">
					<template v-if="showLabel" #label>Custom volume</template>
				</Slider>
			`,
		});
		const wrapper = render(parent);
		const control = wrapper.getByRole('slider', { name: 'Volume' });

		expect(wrapper.queryByText('Custom volume')).not.toBeInTheDocument();
		await fireEvent.click(wrapper.getByRole('button'));
		expect(wrapper.getByRole('slider', { name: 'Custom volume' })).toHaveAttribute(
			'aria-labelledby',
			wrapper.getByText('Custom volume').id,
		);
		await fireEvent.click(wrapper.getByRole('button'));
		expect(wrapper.queryByText('Custom volume')).not.toBeInTheDocument();
		expect(control).not.toHaveAttribute('aria-labelledby');
		expect(wrapper.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
	});

	it('shows markers by default and can disable them', async () => {
		const wrapper = render(Slider, { props: { label: 'Volume' } });

		expect(wrapper.container.querySelectorAll('.hashmark')).toHaveLength(9);
		await wrapper.rerender({ showStepMarkers: false });
		expect(wrapper.container.querySelectorAll('.hashmark')).toHaveLength(0);
	});

	it('applies aria-label to the slider control', () => {
		const wrapper = render(Slider, { props: { ariaLabel: 'Volume', hideValue: true } });
		const control = wrapper.getByRole('slider', { name: 'Volume' });

		expect(control).toHaveAttribute('aria-label', 'Volume');
		expect(control).not.toHaveAttribute('aria-labelledby');
		expect(wrapper.container.firstElementChild).not.toHaveAttribute('aria-label');
	});

	it('uses an external label before other accessible names', () => {
		const wrapper = render(Slider, {
			props: { label: 'Internal', ariaLabel: 'Other', ariaLabelledby: 'external-label' },
		});
		const externalLabel = document.createElement('span');
		externalLabel.id = 'external-label';
		externalLabel.textContent = 'External volume';
		wrapper.container.prepend(externalLabel);

		expect(wrapper.getByRole('slider', { name: 'External volume' })).toHaveAttribute(
			'aria-labelledby',
			'external-label',
		);
	});

	it('keeps the label and value outside the track', async () => {
		const wrapper = render(Slider, { props: { label: 'Volume', defaultValue: [50] } });
		const control = wrapper.getByRole('slider');
		const label = wrapper.getByText('Volume');
		const visibleValue = wrapper.getByText('50');

		expect(control.parentElement).not.toContainElement(label);
		expect(control.parentElement).not.toContainElement(visibleValue);
		await fireEvent.pointerDown(label, { pointerId: 1, button: 0, clientX: 50 });

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toBeUndefined();
	});

	it.each([
		['ArrowUp', 22],
		['ArrowRight', 22],
		['ArrowDown', 18],
		['ArrowLeft', 18],
		['Home', 10],
		['End', 30],
		['PageUp', 30],
		['PageDown', 10],
	])('changes the value with %s', async (key, expected) => {
		const wrapper = render(Slider, {
			props: { label: 'Volume', defaultValue: [20], minValue: 10, maxValue: 30, step: 2 },
		});
		const control = wrapper.getByRole('slider');
		control.focus();

		await fireEvent.keyDown(control, { key });

		expect(control).toHaveAttribute('aria-valuenow', String(expected));
		expect(wrapper.emitted('update:modelValue')).toEqual([[[expected]]]);
		expect(wrapper.emitted('valueCommit')).toEqual([[[expected]]]);
	});

	it.each([
		['ArrowUp', 60],
		['ArrowRight', 60],
		['ArrowDown', 20],
		['ArrowLeft', 20],
	])('uses ten steps for Shift + %s', async (key, expected) => {
		const wrapper = render(Slider, {
			props: { label: 'Volume', defaultValue: [40], step: 2 },
		});
		const control = wrapper.getByRole('slider');

		await fireEvent.keyDown(control, { key, shiftKey: true });

		expect(control).toHaveAttribute('aria-valuenow', String(expected));
		expect(wrapper.emitted('update:modelValue')).toEqual([[[expected]]]);
		expect(wrapper.emitted('valueCommit')).toEqual([[[expected]]]);
	});

	it('uses ten steps for page keys', async () => {
		const wrapper = render(Slider, {
			props: { label: 'Volume', defaultValue: [40], step: 2 },
		});
		const control = wrapper.getByRole('slider');

		await fireEvent.keyDown(control, { key: 'PageUp' });
		expect(control).toHaveAttribute('aria-valuenow', '60');
		await fireEvent.keyDown(control, { key: 'PageDown' });
		expect(control).toHaveAttribute('aria-valuenow', '40');
	});

	it.each([
		['ArrowUp', 100],
		['ArrowDown', 0],
	])('does not emit at the limit for %s', async (key, defaultValue) => {
		const wrapper = render(Slider, { props: { label: 'Volume', defaultValue: [defaultValue] } });

		await fireEvent.keyDown(wrapper.getByRole('slider'), { key });

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toBeUndefined();
	});

	it.each([50, 80])('commits the pointer value %s on release', async (pointerValue) => {
		const wrapper = render(Slider, { props: { label: 'Volume', defaultValue: [50] } });
		const control = wrapper.getByRole('slider');
		vi.spyOn(control, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			right: 100,
			bottom: 40,
			width: 100,
			height: 40,
			toJSON: () => ({}),
		});
		control.setPointerCapture = vi.fn();
		control.hasPointerCapture = vi.fn(() => true);
		control.releasePointerCapture = vi.fn();

		await fireEvent.pointerDown(control, { pointerId: 1, button: 0, clientX: 50 });

		expect(control).toHaveAttribute('aria-valuenow', '50');
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toBeUndefined();

		await fireEvent.pointerMove(control, { pointerId: 1, buttons: 1, clientX: pointerValue });

		expect(control).toHaveAttribute('aria-valuenow', String(pointerValue));
		expect(wrapper.emitted('update:modelValue')).toEqual(
			pointerValue === 50 ? undefined : [[[pointerValue]]],
		);
		expect(wrapper.emitted('valueCommit')).toBeUndefined();

		await fireEvent.pointerUp(control, { pointerId: 1, button: 0, clientX: pointerValue });

		expect(control).toHaveAttribute('aria-valuenow', String(pointerValue));
		expect(wrapper.emitted('update:modelValue')).toEqual(
			pointerValue === 50 ? undefined : [[[pointerValue]]],
		);
		expect(wrapper.emitted('valueCommit')).toEqual([[[pointerValue]]]);
		expect(control.releasePointerCapture).toHaveBeenCalledWith(1);
	});

	it('ignores keys when disabled', async () => {
		const wrapper = render(Slider, { props: { label: 'Volume', disabled: true } });

		const control = wrapper.getByRole('slider');

		expect(control.parentElement).toHaveClass('disabled');
		expect(control).toHaveAttribute('aria-disabled', 'true');
		expect(control).toHaveAttribute('tabindex', '-1');

		await fireEvent.keyDown(control, { key: 'ArrowUp' });

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toBeUndefined();
	});

	it('prevents scrolling only for handled keys', async () => {
		const wrapper = render(Slider, { props: { label: 'Volume' } });
		const control = wrapper.getByRole('slider');
		const arrowEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
		const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });

		await fireEvent(control, arrowEvent);
		await fireEvent(control, tabEvent);

		expect(arrowEvent.defaultPrevented).toBe(true);
		expect(tabEvent.defaultPrevented).toBe(false);
	});

	it('does not emit value events on render', () => {
		const wrapper = render(Slider, {
			props: { label: 'Price', modelValue: [20] },
		});

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toBeUndefined();
	});
});
