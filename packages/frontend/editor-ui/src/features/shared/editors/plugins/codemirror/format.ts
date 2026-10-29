import { EditorSelection, Facet } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { BuiltInParserName } from 'prettier';
import { loadPrettier } from '@/features/shared/editors/utils/loadPrettier';

export type CodeEditorLanguage = 'json' | 'html' | 'javaScript' | 'python';

export const languageFacet = Facet.define<CodeEditorLanguage, CodeEditorLanguage>({
	combine: (values) => values[0] ?? 'javaScript',
});

async function format(view: EditorView, parser: BuiltInParserName) {
	const { formatWithCursor, plugins } = await loadPrettier();

	const { formatted, cursorOffset } = await formatWithCursor(view.state.doc.toString(), {
		cursorOffset: view.state.selection.main.anchor,
		parser,
		plugins: [plugins.babel, plugins.estree],
	});

	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: formatted,
		},
		selection: EditorSelection.single(cursorOffset),
	});
}

export function formatDocument(view: EditorView) {
	const langauge = view.state.facet(languageFacet);
	switch (langauge) {
		case 'javaScript':
			void format(view, 'babel');
			break;
		case 'html':
			void format(view, 'html');
			break;
		case 'json':
			void format(view, 'json');
			break;
		default:
			return false;
	}

	return true;
}
