import { fireEvent, render } from '@testing-library/vue';

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

	it('commits the current value on pointer release without a value update', async () => {
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

		expect(wrapper.emitted('valueCommit')).toBeUndefined();

		await fireEvent.pointerUp(control, { pointerId: 1, button: 0, clientX: 50 });

		expect(control).toHaveAttribute('aria-valuenow', '50');
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('valueCommit')).toEqual([[[50]]]);
		expect(control.releasePointerCapture).toHaveBeenCalledWith(1);
	});

	it('ignores keys when disabled', async () => {
		const wrapper = render(Slider, { props: { label: 'Volume', disabled: true } });

		await fireEvent.keyDown(wrapper.getByRole('slider'), { key: 'ArrowUp' });

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
