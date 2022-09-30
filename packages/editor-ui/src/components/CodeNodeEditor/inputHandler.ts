import { completionStatus, insertBracket } from '@codemirror/autocomplete';
import { codePointAt, codePointSize } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Customized input handler to prevent token autoclosing in certain cases.
 *
 * Based on: https://github.com/codemirror/closebrackets/blob/0a56edfaf2c6d97bc5e88f272de0985b4f41e37a/src/closebrackets.ts#L79
 */
export const customInputHandler = EditorView.inputHandler.of((view, from, to, insert) => {
	if (view.composing || view.state.readOnly) return false;

	// customization: do not autoclose tokens during autocompletion
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
