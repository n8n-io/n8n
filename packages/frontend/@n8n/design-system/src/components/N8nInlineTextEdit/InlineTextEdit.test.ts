import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nInlineTextEdit from './InlineTextEdit.vue';

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
});
