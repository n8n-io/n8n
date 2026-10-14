import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { mock } from 'vitest-mock-extended';

import { formatDocument, languageFacet, type CodeEditorLanguage } from './format';
import { loadPrettier, type PrettierModules } from '@/features/shared/editors/utils/loadPrettier';

vi.mock('@/features/shared/editors/utils/loadPrettier', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/shared/editors/utils/loadPrettier')>();
	return { loadPrettier: vi.fn(actual.loadPrettier) };
});

describe('formatDocument', () => {
	const editors: EditorView[] = [];

	const createEditor = (
		doc: string,
		language: CodeEditorLanguage,
		cursor = 0,
		readOnly = false,
	) => {
		const editor = new EditorView({
			parent: document.body,
			state: EditorState.create({
				doc,
				selection: EditorSelection.single(cursor),
				extensions: [languageFacet.of(language), EditorState.readOnly.of(readOnly)],
			}),
		});
		editors.push(editor);
		return editor;
	};

	afterEach(() => {
		editors.splice(0).forEach((editor) => editor.destroy());
	});

	it('formats JavaScript', async () => {
		const editor = createEditor('const a={b:1}', 'javaScript');

		expect(formatDocument(editor)).toBe(true);

		await vi.waitFor(() => expect(editor.state.doc.toString()).toBe('const a = { b: 1 };\n'));
	});

	it('keeps the cursor on the same token after formatting', async () => {
		const editor = createEditor('const a={b:1}', 'javaScript', 9);

		formatDocument(editor);

		await vi.waitFor(() => expect(editor.state.doc.toString()).toBe('const a = { b: 1 };\n'));
		expect(editor.state.selection.main.head).toBe(12);
	});

	it('formats JSON', async () => {
		const editor = createEditor('{"a":1,"b":[1,2]}', 'json');

		expect(formatDocument(editor)).toBe(true);

		await vi.waitFor(() => expect(editor.state.doc.toString()).toBe('{ "a": 1, "b": [1, 2] }\n'));
	});

	it('does not handle Python, so the key goes to the next binding', () => {
		const editor = createEditor("x = {'a':1}", 'python');

		expect(formatDocument(editor)).toBe(false);
		expect(editor.state.doc.toString()).toBe("x = {'a':1}");
	});

	describe('while prettier loads', () => {
		const deferPrettier = () => {
			const { promise, resolve, reject } = Promise.withResolvers<PrettierModules>();
			vi.mocked(loadPrettier).mockReturnValueOnce(promise);
			return { resolve, reject };
		};

		const realPrettier = async () =>
			await vi
				.importActual<typeof import('@/features/shared/editors/utils/loadPrettier')>(
					'@/features/shared/editors/utils/loadPrettier',
				)
				.then(async (module) => await module.loadPrettier());

		it('makes the editor read-only and marks it as formatting', () => {
			deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');

			formatDocument(editor);

			expect(editor.state.readOnly).toBe(true);
			expect(editor.dom).toHaveClass('cm-formatting');
		});

		it('makes the editor editable again after the format succeeds', async () => {
			const prettier = deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');

			formatDocument(editor);
			prettier.resolve(await realPrettier());

			await vi.waitFor(() => expect(editor.state.doc.toString()).toBe('const a = { b: 1 };\n'));
			expect(editor.state.readOnly).toBe(false);
			expect(editor.dom).not.toHaveClass('cm-formatting');
		});

		it('makes the editor editable again after the format fails', async () => {
			const prettier = deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');

			formatDocument(editor);
			prettier.reject(new Error('Failed to load'));

			await vi.waitFor(() => expect(editor.state.readOnly).toBe(false));
			expect(editor.dom).not.toHaveClass('cm-formatting');
			expect(editor.state.doc.toString()).toBe('const a={b:1}');
		});

		it('keeps text that changes during the wait', async () => {
			const prettier = deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');

			formatDocument(editor);
			editor.dispatch({ changes: { from: editor.state.doc.length, insert: ';' } });
			prettier.resolve(await realPrettier());

			await vi.waitFor(() => expect(editor.state.readOnly).toBe(false));
			expect(editor.state.doc.toString()).toBe('const a={b:1};');
		});

		it('does not fail when the editor closes during the wait', async () => {
			const prettier = deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');
			const formatWithCursor = vi.fn().mockResolvedValue({ formatted: 'x', cursorOffset: 0 });

			formatDocument(editor);
			editor.destroy();
			prettier.resolve(mock<PrettierModules>({ formatWithCursor }));

			await vi.waitFor(() => expect(formatWithCursor).toHaveBeenCalled());
		});

		it('runs one format at a time', () => {
			deferPrettier();
			const editor = createEditor('const a={b:1}', 'javaScript');
			vi.mocked(loadPrettier).mockClear();

			formatDocument(editor);
			formatDocument(editor);

			expect(loadPrettier).toHaveBeenCalledTimes(1);
		});

		it('does not format a read-only editor', () => {
			const editor = createEditor('const a={b:1}', 'javaScript', 0, true);
			vi.mocked(loadPrettier).mockClear();

			formatDocument(editor);

			expect(loadPrettier).not.toHaveBeenCalled();
			expect(editor.dom).not.toHaveClass('cm-formatting');
		});
	});
});
