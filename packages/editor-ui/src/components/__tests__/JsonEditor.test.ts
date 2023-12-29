import { createTestingPinia } from '@pinia/testing';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import { renderComponent } from '@/__tests__/render';

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
		const result = renderEditor(modelValue);
		expect(result.container.querySelector('.cm-content')?.textContent).toEqual(modelValue);
	});

	it('renders multiline json', async () => {
		const modelValue = '{\n\t"testing": [true, 5]\n}';
		const result = renderEditor(modelValue);
		const gutter = result.container.querySelector('.cm-gutters');
		expect(gutter?.querySelectorAll('.cm-lineNumbers .cm-gutterElement').length).toEqual(4);

		const content = result.container.querySelector('.cm-content');
		const lines = [...content!.querySelectorAll('.cm-line').values()].map((l) => l.textContent);
		expect(lines).toEqual(['{', '\t"testing": [true, 5]', '}']);
	});
});
