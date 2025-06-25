import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@n8n/design-system/__tests__/render';

import N8nInlineTextEdit from './InlineTextEdit.vue';

const renderComponent = createComponentRenderer(N8nInlineTextEdit);

describe('InlineTextEditCopy', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should emit value on enter', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const input = wrapper.getByTestId('inline-edit-input');

		await wrapper.rerender({ modelValue: 'New Value' });
		await userEvent.clear(input);
		await userEvent.type(input, 'Updated Value');
		await userEvent.keyboard('{Enter}');

		expect(wrapper.emitted('update:modelValue')[0]).toStrictEqual(['Updated Value']);
	});

	it('should not emit value on escape key press', async () => {
		const wrapper = renderComponent({
			props: {
				modelValue: 'Test Value',
			},
		});
		const input = wrapper.getByTestId('inline-edit-input');

		await userEvent.type(input, 'Updated Value');
		await userEvent.keyboard('{Escape}');

		expect(wrapper.emitted('update:modelValue')).toBeFalsy();
	});
});
