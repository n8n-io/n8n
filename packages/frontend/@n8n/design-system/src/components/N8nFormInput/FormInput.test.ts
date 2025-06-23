import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nFormInput from '.';

const renderComponent = createComponentRenderer(N8nFormInput);

describe('N8nFormInput', () => {
	it('should render correctly with label and placeholder', () => {
		const { getByRole, container } = renderComponent({
			props: {
				modelValue: 'test',
				label: 'Test Label',
				placeholder: 'Enter text',
			},
		});
		expect(getByRole('textbox')).toHaveValue('test');
		expect(getByRole('textbox')).toHaveAttribute('placeholder', 'Enter text');
		expect(container.querySelector('label')).toHaveTextContent('Test Label');
	});

	it('should validate required', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				modelValue: '',
				label: 'Test Label',
				required: true,
			},
		});

		expect(emitted('validate')).toEqual([[false]]);

		const input = getByRole('textbox');
		await userEvent.type(input, 'test');
		await userEvent.tab();

		expect(emitted('validate')).toEqual([[false], [true]]);

		await userEvent.clear(input);
		await userEvent.tab();

		expect(emitted('validate')).toEqual([[false], [true], [false]]);
	});
});
