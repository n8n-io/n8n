import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import MetricsInput from '../EditDefinition/MetricsInput.vue';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(MetricsInput);

describe('MetricsInput', () => {
	let props: { modelValue: Array<{ name: string }> };

	beforeEach(() => {
		props = {
			modelValue: [{ name: 'Metric 1' }, { name: 'Metric 2' }],
		};
	});

	it('should render correctly with initial metrics', () => {
		const { getAllByPlaceholderText } = renderComponent({ props });
		const inputs = getAllByPlaceholderText('Enter metric name');
		expect(inputs).toHaveLength(2);
		expect(inputs[0]).toHaveValue('Metric 1');
		expect(inputs[1]).toHaveValue('Metric 2');
	});

	it('should update a metric when typing in the input', async () => {
		const { getAllByPlaceholderText, emitted } = renderComponent({
			props: {
				modelValue: [{ name: '' }],
			},
		});
		const inputs = getAllByPlaceholderText('Enter metric name');
		await userEvent.type(inputs[0], 'Updated Metric 1');

		// Every character typed triggers an update event. Let's check the last emission.
		const allEmits = emitted('update:modelValue');
		expect(allEmits).toBeTruthy();
		// The last emission should contain the fully updated name
		const lastEmission = allEmits[allEmits.length - 1];
		expect(lastEmission).toEqual([[{ name: 'Updated Metric 1' }]]);
	});

	it('should render correctly with no initial metrics', () => {
		props.modelValue = [];
		const { queryAllByRole, getByText } = renderComponent({ props });
		const inputs = queryAllByRole('textbox');
		expect(inputs).toHaveLength(0);
		expect(getByText('New metric')).toBeInTheDocument();
	});

	it('should handle adding multiple metrics', async () => {
		const { getByText, emitted } = renderComponent({ props });
		const addButton = getByText('New metric');

		await userEvent.click(addButton);
		await userEvent.click(addButton);
		await userEvent.click(addButton);

		// Each click adds a new metric
		const updateEvents = emitted('update:modelValue');
		expect(updateEvents).toHaveLength(3);

		// Check the structure of one of the emissions
		// Initial: [{ name: 'Metric 1' }, { name: 'Metric 2' }]
		// After first click: [{ name: 'Metric 1' }, { name: 'Metric 2' }, { name: '' }]
		expect(updateEvents[0]).toEqual([[{ name: 'Metric 1' }, { name: 'Metric 2' }, { name: '' }]]);
	});

	it('should emit "deleteMetric" event when a delete button is clicked', async () => {
		const { getAllByRole, emitted } = renderComponent({ props });

		// Each metric row has a delete button, identified by "button"
		const deleteButtons = getAllByRole('button', { name: '' });
		expect(deleteButtons).toHaveLength(props.modelValue.length);

		// Click on the delete button for the second metric
		await userEvent.click(deleteButtons[1]);

		expect(emitted('deleteMetric')).toBeTruthy();
		expect(emitted('deleteMetric')[0]).toEqual([{ name: 'Metric 2' }]);
	});

	it('should emit multiple update events as the user types and reflect the final name correctly', async () => {
		const { getAllByPlaceholderText, emitted } = renderComponent({
			props: {
				modelValue: [{ name: '' }],
			},
		});
		const inputs = getAllByPlaceholderText('Enter metric name');
		await userEvent.type(inputs[0], 'ABC');

		const allEmits = emitted('update:modelValue');
		expect(allEmits).toBeTruthy();
		// Each character typed should emit a new value
		expect(allEmits.length).toBe(3);
		expect(allEmits[2]).toEqual([[{ name: 'ABC' }]]);
	});

	it('should not break if metrics are empty and still allow adding a new metric', async () => {
		props.modelValue = [];
		const { queryAllByRole, getByText, emitted } = renderComponent({ props });

		// No metrics initially
		const inputs = queryAllByRole('textbox');
		expect(inputs).toHaveLength(0);

		const addButton = getByText('New metric');
		await userEvent.click(addButton);

		const updates = emitted('update:modelValue');
		expect(updates).toBeTruthy();
		expect(updates[0]).toEqual([[{ name: '' }]]);

		// After adding one metric, we should now have an input
		const { getAllByPlaceholderText } = renderComponent({
			props: { modelValue: [{ name: '' }] },
		});
		const updatedInputs = getAllByPlaceholderText('Enter metric name');
		expect(updatedInputs).toHaveLength(1);
	});

	it('should handle deleting the first metric and still display remaining metrics correctly', async () => {
		const { getAllByPlaceholderText, getAllByRole, rerender, emitted } = renderComponent({
			props,
		});
		const inputs = getAllByPlaceholderText('Enter metric name');
		expect(inputs).toHaveLength(2);

		const deleteButtons = getAllByRole('button', { name: '' });
		await userEvent.click(deleteButtons[0]);

		expect(emitted('deleteMetric')).toBeTruthy();
		expect(emitted('deleteMetric')[0]).toEqual([{ name: 'Metric 1' }]);

		await rerender({ modelValue: [{ name: 'Metric 2' }] });
		const updatedInputs = getAllByPlaceholderText('Enter metric name');
		expect(updatedInputs).toHaveLength(1);
		expect(updatedInputs[0]).toHaveValue('Metric 2');
	});
});
