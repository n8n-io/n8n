import {
	closeBrackets,
	completionStatus,
	insertBracket,
	startCompletion,
} from '@codemirror/autocomplete';
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

	if (!transaction) {
		// customization: brace setup when surrounded by HTML tags: <div></div> -> <div>{| }</div>
		if (insert === '{') {
			const cursor = view.state.selection.main.head;
			view.dispatch({
				changes: { from: cursor, insert: '{ }' },
				selection: { anchor: cursor + 1 },
			});
			return true;
		}

		return false;
	}

	view.dispatch(transaction);

	// customization: inject whitespace and second brace for brace completion: {| } -> {{ | }}

	const cursor = view.state.selection.main.head;

	const isBraceCompletion =
		view.state.sliceDoc(cursor - 2, cursor) === '{{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isBraceCompletion) {
		view.dispatch({
			changes: { from: cursor, to: cursor + 2, insert: '  }' },
			selection: { anchor: cursor + 1 },
		});

		startCompletion(view);

		return true;
	}

	// customization: inject whitespace for brace setup: empty -> {| }

	const isBraceSetup =
		view.state.sliceDoc(cursor - 1, cursor) === '{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	const { head } = view.state.selection.main;

	const isInsideResolvable =
		view.state.sliceDoc(0, head).includes('{{') &&
		view.state.sliceDoc(head, view.state.doc.length).includes('}}');

	if (isBraceSetup && !isInsideResolvable) {
		view.dispatch({ changes: { from: cursor, insert: ' ' } });

		return true;
	}

	// customization: inject whitespace for brace completion from selection: {{abc|}} -> {{ abc| }}

	const [range] = view.state.selection.ranges;

	const isBraceCompletionFromSelection =
		view.state.sliceDoc(range.from - 2, range.from) === '{{' &&
		view.state.sliceDoc(range.to, range.to + 2) === '}}';

	if (isBraceCompletionFromSelection) {
		view.dispatch(
			{ changes: { from: range.from, insert: ' ' } },
			{ changes: { from: range.to, insert: ' ' }, selection: { anchor: range.to, head: range.to } },
		);

		return true;
	}

	return true;
});

const [_, bracketState] = closeBrackets() as readonly Extension[];

/**
 * CodeMirror plugin for (inline and modal) expression editor:
 *
 * - prevent token autoclosing during autocompletion (exception: `{`),
 * - prevent square bracket autoclosing prior to `.json`
 * - inject whitespace and braces for resolvables
 * - set up braces when surrounded by HTML tags
 *
 * Other than segments marked `customization`, this is a copy of the [original](https://github.com/codemirror/closebrackets/blob/0a56edfaf2c6d97bc5e88f272de0985b4f41e37a/src/closebrackets.ts#L79).
 */
export const expressionInputHandler = () => [handler, bracketState];
