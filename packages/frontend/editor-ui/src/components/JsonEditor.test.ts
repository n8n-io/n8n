import { createTestingPinia } from '@pinia/testing';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import { renderComponent } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { userEvent } from '@testing-library/user-event';

describe('JsonEditor', () => {
	const renderEditor = (jsonString: string) =>
		renderComponent(JsonEditor, {
			global: {
				plugins: [createTestingPinia()],
			},
			props: { modelValue: jsonString },
		});

	it('renders simple json', async () => {
		const modelValue = '{ "testing": [true, 5] }';
		const { getByRole } = renderEditor(modelValue);
		expect(getByRole('textbox').textContent).toEqual(modelValue);
	});

	it('renders multiline json', async () => {
		const modelValue = '{\n\t"testing": [true, 5]\n}';
		const { getByRole, container } = renderEditor(modelValue);
		const gutter = container.querySelector('.cm-gutters');
		expect(gutter?.querySelectorAll('.cm-lineNumbers .cm-gutterElement').length).toEqual(4);

		const content = getByRole('textbox');
		const lines = [...content.querySelectorAll('.cm-line').values()].map((l) => l.textContent);
		expect(lines).toEqual(['{', '\t"testing": [true, 5]', '}']);
	});

	it('emits update:model-value events', async () => {
		const modelValue = '{ "test": 1 }';

		const { emitted, getByRole } = renderEditor(modelValue);

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, 'test');

		await waitFor(() => expect(emitted('update:modelValue')).toContainEqual(['test{ "test": 1 }']));
	});
});
