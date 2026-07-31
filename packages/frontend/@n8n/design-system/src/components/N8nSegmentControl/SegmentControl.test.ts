import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';

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
			attrs: {
				'data-test-id': 'segment-control',
			},
		});

		expect(getByRole('radiogroup')).toHaveAttribute('data-test-id', 'segment-control');
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
			const [value] = emitted('update:modelValue')![0] as [boolean, MouseEvent];
			expect(value).toBe(true);
		});
	});

	it('renders option labels when no option slot is provided', () => {
		const { getByRole } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options,
			},
		});

		expect(getByRole('radio', { name: 'One' })).toHaveTextContent('One');
		expect(getByRole('radio', { name: 'Two' })).toHaveTextContent('Two');
		expect(getByRole('radio', { name: 'Three' })).toHaveTextContent('Three');
	});

	it('distinguishes boolean false from string "false"', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				modelValue: false,
				options: [
					{ label: 'Boolean false', value: false },
					{ label: 'String false', value: 'false' },
				],
			},
		});

		expect(getByRole('radio', { name: 'Boolean false' })).toBeChecked();
		expect(getByRole('radio', { name: 'String false' })).not.toBeChecked();

		await userEvent.click(getByRole('radio', { name: 'String false' }));

		await waitFor(() => {
			const [value] = emitted('update:modelValue')![0] as [string | boolean, MouseEvent];
			expect(value).toBe('false');
		});
	});

	it('supports uncontrolled usage via defaultValue', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				defaultValue: 'two',
				options,
			},
		});

		expect(getByRole('radio', { name: 'Two' })).toBeChecked();

		await userEvent.click(getByRole('radio', { name: 'Three' }));

		await waitFor(() => {
			const [value] = emitted('update:modelValue')![0] as [string, MouseEvent];
			expect(value).toBe('three');
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

	it('does not emit when the option is disabled', async () => {
		const { getByRole, emitted } = render(SegmentControl, {
			props: {
				modelValue: 'one',
				options: [
					{ label: 'One', value: 'one' },
					{ label: 'Two', value: 'two', disabled: true },
				],
			},
		});

		await userEvent.click(getByRole('radio', { name: 'Two' }));

		expect(emitted('update:modelValue')).toBeUndefined();
	});
});
