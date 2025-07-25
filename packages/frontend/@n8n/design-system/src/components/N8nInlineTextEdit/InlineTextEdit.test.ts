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

	it('should not update value on blur if input is empty', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const preview = wrapper.getByTestId('inline-edit-preview');

		await userEvent.click(preview);
		const input = wrapper.getByTestId('inline-edit-input');

		await userEvent.clear(input);
		await userEvent.tab(); // Simulate blur

		expect(preview).toHaveTextContent('Test Value');
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
});
