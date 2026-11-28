import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';

import N8nInlineTextEdit from './InlineTextEdit.vue';
import { createComponentRenderer } from '../../__tests__/render';

const renderComponent = createComponentRenderer(N8nInlineTextEdit);

describe('N8nInlineTextEdit', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('value should update on enter', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		await userEvent.click(preview);

		const input = wrapper.getByTestId('inline-edit-input');

		await userEvent.clear(input);
		await userEvent.type(input, 'Updated Value');
		await userEvent.keyboard('{Enter}');

		expect(preview).toHaveTextContent('Updated Value');

		const emittedEvents = wrapper.emitted('update:model-value');
		expect(emittedEvents).toBeDefined();
		expect(emittedEvents?.[0]).toEqual(['Updated Value']);
	});

	it('should not update value on enter if input is empty', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		await userEvent.click(preview);
		const input = wrapper.getByTestId('inline-edit-input');

		await userEvent.clear(input);
		await userEvent.keyboard('{Enter}');

		expect(preview).toHaveTextContent('Test Value');
	});

	it('should display changes to props.modelValue', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		expect(preview).toHaveTextContent('Test Value');

		await wrapper.rerender({ modelValue: 'New Value!' });

		expect(preview).toHaveTextContent('New Value!');
	});

	it('should support CSS length values for maxWidth', () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
				maxWidth: '80%',
			},
		});

		const editableArea = wrapper.getByTestId('inline-editable-area');
		const preview = wrapper.getByTestId('inline-edit-preview');
		const input = wrapper.getByTestId('inline-edit-input');

		expect(editableArea).toHaveStyle({
			width: 'clamp(64px, 1px, 80%)',
			maxWidth: '80%',
		});
		expect(preview).toHaveStyle({
			width: '100%',
			maxWidth: '100%',
		});
		expect(input).toHaveStyle({
			width: '100%',
			maxWidth: '100%',
		});
	});

	it('should not update on escape key press', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		await userEvent.click(preview);
		const input = wrapper.getByTestId('inline-edit-input');

		await userEvent.clear(input);
		await userEvent.type(input, 'Updated Value');
		await userEvent.keyboard('{Escape}');

		expect(preview).toHaveTextContent('Test Value');
	});

	it('should not emit update:model-value on blur when value unchanged', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		await userEvent.click(preview);

		await userEvent.tab();

		const emittedEvents = wrapper.emitted('update:model-value');
		expect(emittedEvents).toBeUndefined();
	});

	it('should focus input when any child element is clicked', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const editableArea = wrapper.getByTestId('inline-editable-area');
		const rect = editableArea.getBoundingClientRect();

		// Click the bottom right corner of the parent element
		await userEvent.pointer([
			{ coords: { clientX: rect.right - 1, clientY: rect.bottom - 1 } },
			{ target: editableArea },
			{ keys: '[MouseLeft]' },
		]);

		const input = wrapper.getByTestId('inline-edit-input');
		expect(input).toHaveFocus();
	});

	it('forwards aria-invalid and aria-describedby to the inner input and updates when they change', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});

		const input = wrapper.getByTestId('inline-edit-input');
		expect(input).not.toHaveAttribute('aria-invalid');
		expect(input).not.toHaveAttribute('aria-describedby');

		await wrapper.rerender({
			modelValue: 'Test Value',
			'aria-invalid': 'true',
			'aria-describedby': 'title-error',
			'data-test-id': 'inline-root',
		});

		const root = wrapper.getByTestId('inline-root');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAttribute('aria-describedby', 'title-error');
		expect(root).not.toHaveAttribute('aria-invalid');
		expect(root).not.toHaveAttribute('aria-describedby');

		await wrapper.rerender({
			modelValue: 'Test Value',
			'aria-invalid': undefined,
			'aria-describedby': undefined,
			'data-test-id': 'inline-root',
		});

		expect(input).not.toHaveAttribute('aria-invalid');
		expect(input).not.toHaveAttribute('aria-describedby');
	});

	it('lets fallthrough root attributes override default EditableRoot bindings (e.g. readonly)', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Managed Credential',
			},
			attrs: {
				readonly: true,
			},
		});

		const editableArea = wrapper.getByTestId('inline-editable-area');
		const input = wrapper.getByTestId('inline-edit-input');
		expect(editableArea).toHaveAttribute('data-readonly');
		expect(input).toHaveAttribute('readonly');

		await fireEvent.click(wrapper.getByTestId('inline-edit-preview'));
		expect(editableArea).not.toHaveAttribute('data-focused');

		input.focus();
		await userEvent.keyboard('Changed{Enter}');
		expect(input).toHaveValue('Managed Credential');
		expect(wrapper.emitted('update:model-value')).toBeUndefined();
	});
});
