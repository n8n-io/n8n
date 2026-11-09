import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import N8nFormInput from '.';
import { createComponentRenderer } from '../../__tests__/render';

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
		const { getByRole, emitted, rerender } = renderComponent({
			props: {
				modelValue: '',
				label: 'Test Label',
				required: true,
			},
		});

		expect(emitted('validate')).toEqual([[false]]);

		const input = getByRole('textbox');
		expect(input).toHaveValue('');

		await userEvent.type(input, 'test');
		await userEvent.tab();
		// Re-render to comply with controlled component behavior
		await rerender({
			modelValue: 'test',
			label: 'Test Label',
			required: true,
		});

		expect(input).toHaveValue('test');
		expect(emitted('validate')).toEqual([[false], [true]]);

		await userEvent.clear(input);
		await userEvent.tab();
		// Re-render to comply with controlled component behavior
		await rerender({
			modelValue: '',
			label: 'Test Label',
			required: true,
		});

		expect(emitted('validate')).toEqual([[false], [true], [false]]);
	});

	it('should emit error even with missing or empty error message', async () => {
		const { emitted } = renderComponent({
			props: {
				modelValue: 'test',
				label: 'Test Label',
				required: true,
				showValidationWarnings: true,
				validators: {
					MY_VALIDATION: {
						validate: (value: string) => {
							if (value === 'test') {
								return { messageKey: 'key.noTestAllowed' };
							}
							return false;
						},
					},
				},
				validationRules: [{ name: 'MY_VALIDATION' }],
			},
		});

		expect(emitted('validate')).toEqual([[false]]);
	});

	it('emits enter on Enter but not while the user confirms an IME composition', async () => {
		const { getByRole, emitted } = renderComponent({ props: { modelValue: '', label: 'Name' } });
		const input = getByRole('textbox');

		await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
		await fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
		expect(emitted('enter')).toBeUndefined();

		await fireEvent.keyDown(input, { key: 'Enter' });
		expect(emitted('enter')).toHaveLength(1);
	});
});
