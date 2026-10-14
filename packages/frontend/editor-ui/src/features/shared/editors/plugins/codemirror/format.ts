import {
	Compartment,
	EditorSelection,
	EditorState,
	Facet,
	Prec,
	StateEffect,
	type Extension,
	type TransactionSpec,
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { BuiltInParserName } from 'prettier';
import { loadPrettier } from '@/features/shared/editors/utils/loadPrettier';

export type CodeEditorLanguage = 'json' | 'html' | 'javaScript' | 'python';

export const languageFacet = Facet.define<CodeEditorLanguage, CodeEditorLanguage>({
	combine: (values) => values[0] ?? 'javaScript',
});

const formatLock = new Compartment();

const locked = [
	Prec.highest(EditorState.readOnly.of(true)),
	EditorView.editorAttributes.of({ class: 'cm-formatting' }),
	EditorView.baseTheme({ '&.cm-formatting': { cursor: 'progress', opacity: 0.6 } }),
];

function setFormatLock(view: EditorView, extension: Extension) {
	view.dispatch({
		effects:
			formatLock.get(view.state) === undefined
				? StateEffect.appendConfig.of(formatLock.of(extension))
				: formatLock.reconfigure(extension),
	});
}

export function withFormatLock<Args extends unknown[]>(
	formatter: (view: EditorView, ...args: Args) => Promise<TransactionSpec | undefined>,
) {
	return async (view: EditorView, ...args: Args) => {
		if (view.state.readOnly) return;

		setFormatLock(view, locked);
		const doc = view.state.doc;
		const change = await formatter(view, ...args).catch(() => undefined);
		if (change && view.state.doc === doc) view.dispatch(change);
		setFormatLock(view, []);
	};
}

const format = withFormatLock(async (view: EditorView, parser: BuiltInParserName) => {
	const { formatWithCursor, plugins } = await loadPrettier();

	const { formatted, cursorOffset } = await formatWithCursor(view.state.doc.toString(), {
		cursorOffset: view.state.selection.main.anchor,
		parser,
		plugins: [plugins.babel, plugins.estree],
	});

	return {
		changes: { from: 0, to: view.state.doc.length, insert: formatted },
		selection: EditorSelection.single(cursorOffset),
	};
});

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
