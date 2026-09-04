import { createTestingPinia } from '@pinia/testing';
import JsonEditor from '@/features/shared/editors/components/JsonEditor/JsonEditor.vue';
import { renderComponent } from '@/__tests__/render';
import { EditorView } from '@codemirror/view';
import { waitFor } from '@testing-library/vue';
import { userEvent } from '@testing-library/user-event';

function editorState(container: Element) {
	const dom = container.querySelector<HTMLElement>('.cm-editor');
	return dom ? EditorView.findFromDOM(dom)?.state : undefined;
}

describe('JsonEditor', () => {
	const renderEditor = (jsonString: string, isReadOnly = false) =>
		renderComponent(JsonEditor, {
			global: {
				plugins: [createTestingPinia()],
			},
			props: { modelValue: jsonString, isReadOnly },
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

	it('updates editor content when modelValue changes to a value of the same length', async () => {
		const { getByRole, rerender } = renderEditor('{"key": "old"}');

		await rerender({ modelValue: '{"key": "***"}' });

		await waitFor(() => expect(getByRole('textbox').textContent).toEqual('{"key": "***"}'));
	});

	it('emits update:model-value events', async () => {
		const modelValue = '{ "test": 1 }';

		const { emitted, getByRole } = renderEditor(modelValue);

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, 'test');

		await waitFor(() => expect(emitted('update:modelValue')).toContainEqual(['test{ "test": 1 }']));
	});

	describe('read-only state', () => {
		it('becomes editable when the read-only prop is turned off at runtime', async () => {
			const modelValue = '{ "test": 1 }';
			const { container, emitted, getByRole, rerender } = renderEditor(modelValue, true);

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));

			await rerender({ isReadOnly: false });

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(false));
			expect(container.querySelectorAll('.cm-editor')).toHaveLength(1);
			expect(getByRole('textbox').textContent).toEqual(modelValue);

			await userEvent.type(getByRole('textbox'), 'test');

			await waitFor(() =>
				expect(emitted('update:modelValue')).toContainEqual(['test{ "test": 1 }']),
			);
		});

		it('keeps unsaved edits when the read-only prop is turned on at runtime', async () => {
			// `modelValue` is debounced upstream, so it still holds the pre-edit value
			// when another tab takes the write lock mid-typing
			const { container, getByRole, rerender } = renderEditor('{ "test": 1 }');

			await userEvent.type(await waitFor(() => getByRole('textbox')), 'test');
			await waitFor(() => expect(getByRole('textbox').textContent).toEqual('test{ "test": 1 }'));

			await rerender({ isReadOnly: true });

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));
			expect(getByRole('textbox').textContent).toEqual('test{ "test": 1 }');
		});
	});
});
