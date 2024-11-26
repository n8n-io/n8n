import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import MetricsInput from '../EditDefinition/MetricsInput.vue';
import userEvent from '@testing-library/user-event';

const renderComponent = createComponentRenderer(MetricsInput);

describe('MetricsInput', () => {
	let props: { modelValue: string[] };

	beforeEach(() => {
		props = {
			modelValue: ['Metric 1', 'Metric 2'],
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
				modelValue: [''],
			},
		});
		const inputs = getAllByPlaceholderText('Enter metric name');
		await userEvent.type(inputs[0], 'Updated Metric 1');

		expect(emitted('update:modelValue')).toBeTruthy();
		expect(emitted('update:modelValue')).toEqual('Updated Metric 1'.split('').map((c) => [[c]]));
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

		addButton.click();
		addButton.click();
		addButton.click();

		expect(emitted('update:modelValue')).toHaveProperty('length', 3);
	});
});
