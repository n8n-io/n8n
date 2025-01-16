import { renderComponent } from '@/__tests__/render';
import { EditorView } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, vi } from 'vitest';
import { defineComponent, h, ref, toValue } from 'vue';
import { useCodeEditor } from './useCodeEditor';
import userEvent from '@testing-library/user-event';

describe('useCodeEditor', () => {
	const defaultOptions: Omit<Parameters<typeof useCodeEditor>[0], 'editorRef'> = {
		language: 'javaScript',
	};

	const renderCodeEditor = async (options: Partial<typeof defaultOptions> = defaultOptions) => {
		let codeEditor!: ReturnType<typeof useCodeEditor>;
		const renderResult = renderComponent(
			defineComponent({
				setup() {
					const root = ref<HTMLElement>();
					codeEditor = useCodeEditor({ ...defaultOptions, ...options, editorRef: root });

					return () => h('div', { ref: root, 'data-test-id': 'editor-root' });
				},
			}),
			{ props: { options } },
		);
		expect(renderResult.getByTestId('editor-root')).toBeInTheDocument();
		await waitFor(() => toValue(codeEditor.editor));
		return { renderResult, codeEditor };
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should create an editor', async () => {
		const { codeEditor } = await renderCodeEditor();

		await waitFor(() => expect(toValue(codeEditor.editor)).toBeInstanceOf(EditorView));
	});

	it('should focus editor', async () => {
		const { renderResult, codeEditor } = await renderCodeEditor({});

		const root = renderResult.getByTestId('editor-root');
		const input = root.querySelector('.cm-line') as HTMLDivElement;

		await userEvent.click(input);

		expect(codeEditor.editor.value?.hasFocus).toBe(true);
	});

	it('should emit changes', async () => {
		vi.useFakeTimers();

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime,
		});

		const onChange = vi.fn();
		const { renderResult } = await renderCodeEditor({
			onChange,
		});

		const root = renderResult.getByTestId('editor-root');
		const input = root.querySelector('.cm-line') as HTMLDivElement;

		await user.type(input, 'test');

		vi.advanceTimersByTime(300);

		expect(onChange.mock.calls[0][0].state.doc.toString()).toEqual('test');
	});

	it('should emit debounced changes before unmount', async () => {
		vi.useFakeTimers();

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime,
		});

		const onChange = vi.fn();
		const { renderResult } = await renderCodeEditor({
			onChange,
		});

		const root = renderResult.getByTestId('editor-root');
		const input = root.querySelector('.cm-line') as HTMLDivElement;

		await user.type(input, 'test');

		// Rerender will unmount and remount the component
		// This should trigger the debounced change to be emitted
		// Because we have `await lastChangePromise` in the unmounted hook
		// Unmount is delayed until the last change is emitted
		await renderResult.rerender({ key: 'old' });

		const snapshotBeforeUnmount = renderResult.html();
		expect(onChange).not.toHaveBeenCalled();

		// The last change should be emitted after unmount
		vi.advanceTimersByTime(300);

		expect(onChange.mock.calls[0][0].state.doc.toString()).toEqual('test');

		// This should rerender the component after unmounting
		await renderResult.rerender({ key: 'new' });

		const snapshotAfterUnmount = renderResult.html();

		expect(snapshotBeforeUnmount).not.toEqual(snapshotAfterUnmount);
		expect(snapshotBeforeUnmount.split('\n').length).toBeGreaterThan(
			snapshotAfterUnmount.split('\n').length,
		);
	});
});
