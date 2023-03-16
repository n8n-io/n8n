import { closeBrackets, completionStatus, insertBracket } from '@codemirror/autocomplete';
import { codePointAt, codePointSize, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const handler = EditorView.inputHandler.of((view, from, to, insert) => {
	if (view.composing || view.state.readOnly) return false;

	// customization: do not autoclose tokens while autocompletion is active
	if (completionStatus(view.state) !== null) return false;

	const selection = view.state.selection.main;

	// customization: do not autoclose square brackets prior to `.json`
	if (
		insert === '[' &&
		view.state.doc.toString().slice(selection.from - '.json'.length, selection.to) === '.json'
	) {
		return false;
	}

	if (
		insert.length > 2 ||
		(insert.length === 2 && codePointSize(codePointAt(insert, 0)) === 1) ||
		from !== selection.from ||
		to !== selection.to
	) {
		return false;
	}

	const transaction = insertBracket(view.state, insert);

	if (!transaction) return false;

	view.dispatch(transaction);

	return true;
});

const [_, bracketState] = closeBrackets() as readonly Extension[];

/**
 * CodeMirror plugin for code node editor:
 *
 * - prevent token autoclosing during autocompletion
 * - prevent square bracket autoclosing prior to `.json`
 *
 * Other than segments marked `customization`, this is a copy of the [original](https://github.com/codemirror/closebrackets/blob/0a56edfaf2c6d97bc5e88f272de0985b4f41e37a/src/closebrackets.ts#L79).
 */
export const codeInputHandler = () => [handler, bracketState];
