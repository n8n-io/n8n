import {
	closeBrackets,
	closeBracketsKeymap,
	startCompletion,
	type CloseBracketConfig,
} from '@codemirror/autocomplete';
import { EditorSelection, Text } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

const expressionBracketSpacing = EditorView.updateListener.of((update) => {
	if (!update.changes || update.changes.empty) return;

	// {{|}} --> {{ | }}
	update.changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
		const doc = update.state.doc;
		if (
			inserted.eq(Text.of(['{}'])) &&
			doc.sliceString(fromB - 1, fromB) === '{' &&
			doc.sliceString(toB, toB + 1) === '}'
		) {
			update.view.dispatch({
				changes: [{ from: fromB + 1, insert: '  ' }],
				selection: EditorSelection.cursor(toB),
			});
			startCompletion(update.view);
		}
	});
});

export const expressionCloseBracketsConfig: CloseBracketConfig = {
	brackets: ['{', '(', '"', "'", '['],
	// <> so bracket completion works in HTML tags
	before: ')]}:;<>\'"',
};

export const expressionCloseBrackets = () => [
	expressionBracketSpacing,
	closeBrackets(),
	keymap.of(closeBracketsKeymap),
];
