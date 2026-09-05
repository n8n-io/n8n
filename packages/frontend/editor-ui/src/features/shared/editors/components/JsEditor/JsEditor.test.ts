import { createTestingPinia } from '@pinia/testing';
import JsEditor from '@/features/shared/editors/components/JsEditor/JsEditor.vue';
import { renderComponent } from '@/__tests__/render';
import { EditorView } from '@codemirror/view';
import { userEvent } from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

function editorState(container: Element) {
	const dom = container.querySelector<HTMLElement>('.cm-editor');
	return dom ? EditorView.findFromDOM(dom)?.state : undefined;
}

describe('JsEditor', () => {
	const renderEditor = (jsonString: string, isReadOnly = false) =>
		renderComponent(JsEditor, {
			global: {
				plugins: [createTestingPinia()],
			},
			props: { modelValue: jsonString, isReadOnly },
		});

	it('renders simple js', async () => {
		const modelValue = 'return [1, 2, 3]';
		const result = renderEditor(modelValue);
		expect(result.container.querySelector('.cm-content')?.textContent).toEqual(modelValue);
	});

	describe('read-only state', () => {
		it('becomes editable when the read-only prop is turned off at runtime', async () => {
			const modelValue = 'return [1, 2, 3]';
			const { container, emitted, getByRole, rerender } = renderEditor(modelValue, true);

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));

			await rerender({ isReadOnly: false });

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(false));
			expect(container.querySelectorAll('.cm-editor')).toHaveLength(1);
			expect(container.querySelector('.cm-content')?.textContent).toEqual(modelValue);

			await userEvent.type(getByRole('textbox'), 'test');

			await waitFor(() =>
				expect(emitted('update:modelValue')).toContainEqual(['testreturn [1, 2, 3]']),
			);
		});

		it('keeps unsaved edits when the read-only prop is turned on at runtime', async () => {
			// `modelValue` is debounced upstream, so it still holds the pre-edit value
			// when another tab takes the write lock mid-typing
			const { container, getByRole, rerender } = renderEditor('return [1, 2, 3]');

			await userEvent.type(await waitFor(() => getByRole('textbox')), 'test');
			await waitFor(() =>
				expect(container.querySelector('.cm-content')?.textContent).toEqual('testreturn [1, 2, 3]'),
			);

			await rerender({ isReadOnly: true });

			await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));
			expect(container.querySelector('.cm-content')?.textContent).toEqual('testreturn [1, 2, 3]');
		});
	});
});
