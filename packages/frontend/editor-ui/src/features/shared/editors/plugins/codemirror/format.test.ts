import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { formatDocument, languageFacet, type CodeEditorLanguage } from './format';

vi.mock('prettier', async () => await import('prettier/standalone'));

describe('formatDocument', () => {
	const editors: EditorView[] = [];

	const createEditor = (doc: string, language: CodeEditorLanguage, cursor = 0) => {
		const editor = new EditorView({
			parent: document.body,
			state: EditorState.create({
				doc,
				selection: EditorSelection.single(cursor),
				extensions: [languageFacet.of(language)],
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
});
