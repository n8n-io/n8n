import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';

import N8nRadioGroup from './RadioGroup.vue';

const options = [
	{ value: 'all', label: 'All' },
	{ value: 'readOnly', label: 'Read only' },
	{ value: 'custom', label: 'Custom' },
];

describe('N8nRadioGroup', () => {
	it('renders one accessible radio per option', () => {
		const { getAllByRole } = render(N8nRadioGroup, { props: { modelValue: 'all', options } });

		expect(getAllByRole('radio')).toHaveLength(3);
	});

	it('renders option descriptions when provided', () => {
		const { getByText } = render(N8nRadioGroup, {
			props: {
				modelValue: 'custom',
				options: [{ value: 'custom', label: 'Custom', description: 'Pick scopes individually' }],
			},
		});

		expect(getByText('Pick scopes individually')).toBeInTheDocument();
	});

	it('marks the option matching modelValue as checked', () => {
		const { getByRole } = render(N8nRadioGroup, { props: { modelValue: 'readOnly', options } });

		expect(getByRole('radio', { name: 'Read only' })).toBeChecked();
		expect(getByRole('radio', { name: 'All' })).not.toBeChecked();
	});

	it('emits update:modelValue with the selected value', async () => {
		const { getByRole, emitted } = render(N8nRadioGroup, { props: { modelValue: 'all', options } });

		await userEvent.click(getByRole('radio', { name: 'Custom' }));

		expect(emitted('update:modelValue')?.at(-1)).toEqual(['custom']);
	});

	it('does not emit for a disabled option', async () => {
		const { getByRole, emitted } = render(N8nRadioGroup, {
			props: {
				modelValue: 'all',
				options: [
					{ value: 'all', label: 'All' },
					{ value: 'custom', label: 'Custom', disabled: true },
				],
			},
		});

		await userEvent.click(getByRole('radio', { name: 'Custom' }));

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('disables every option when the group is disabled', async () => {
		const { getByRole, emitted } = render(N8nRadioGroup, {
			props: { modelValue: 'all', options, disabled: true },
		});

		expect(getByRole('radio', { name: 'Custom' })).toBeDisabled();

		await userEvent.click(getByRole('radio', { name: 'Custom' }));

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('forwards testId to the radio item element', () => {
		const { getByTestId } = render(N8nRadioGroup, {
			props: { modelValue: 'all', options: [{ value: 'all', label: 'All', testId: 'mode-all' }] },
		});

		expect(getByTestId('mode-all')).toHaveAttribute('role', 'radio');
	});
});
