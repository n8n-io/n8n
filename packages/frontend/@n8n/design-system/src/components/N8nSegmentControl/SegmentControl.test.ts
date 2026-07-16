import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';

import SegmentControl from './SegmentControl.vue';

describe('components.N8nSegmentControl', () => {
	const options = [
		{ label: 'One', value: 'one' },
		{ label: 'Two', value: 'two' },
		{ label: 'Three', value: 'three' },
	];

	it('renders a radiogroup with options', () => {
		const { getByRole, getAllByRole } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options,
			},
		});

		expect(getByRole('radiogroup')).toBeInTheDocument();
		expect(getAllByRole('radio')).toHaveLength(3);
		expect(getByRole('radio', { name: 'One' })).toBeChecked();
	});

	it('emits update:modelValue with the selected value and mouse event on click', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options,
			},
		});

		await userEvent.click(getByRole('radio', { name: 'Two' }));

		await waitFor(() => {
			expect(emitted('update:modelValue')).toBeTruthy();
		});

		const [value, event] = emitted('update:modelValue')![0] as [string, MouseEvent];
		expect(value).toBe('two');
		expect(event).toMatchObject({ type: 'click' });
	});

	it('supports boolean option values', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				modelValue: false,
				options: [
					{ label: 'Off', value: false },
					{ label: 'On', value: true },
				],
			},
		});

		expect(getByRole('radio', { name: 'Off' })).toBeChecked();

		await userEvent.click(getByRole('radio', { name: 'On' }));

		await waitFor(() => {
			expect(emitted('update:modelValue')?.[0]?.[0]).toBe(true);
		});
	});

	it('moves selection with arrow keys', async () => {
		const user = userEvent.setup();
		const { getByRole, emitted, rerender } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options,
			},
		});

		const first = getByRole('radio', { name: 'One' });
		first.focus();
		await user.keyboard('{ArrowRight}');

		await waitFor(() => {
			expect(emitted('update:modelValue')?.[0]?.[0]).toBe('two');
		});

		await rerender({ modelValue: 'two', options });
		await nextTick();

		getByRole('radio', { name: 'Two' }).focus();
		await user.keyboard('{ArrowRight}');

		await waitFor(() => {
			expect(emitted('update:modelValue')?.[1]?.[0]).toBe('three');
		});
	});

	it('does not emit when disabled', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options,
				disabled: true,
			},
		});

		await userEvent.click(getByRole('radio', { name: 'Two' }));

		expect(emitted('update:modelValue')).toBeUndefined();
	});
});
