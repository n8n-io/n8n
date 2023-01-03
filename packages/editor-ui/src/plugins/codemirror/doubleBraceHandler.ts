import { closeBrackets, insertBracket } from '@codemirror/autocomplete';
import { codePointAt, codePointSize, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const inputHandler = EditorView.inputHandler.of((view, from, to, insert) => {
	if (view.composing || view.state.readOnly) return false;

	const selection = view.state.selection.main;

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

	/**
	 * Customizations to inject whitespace and braces for setup and completion
	 */

	const cursor = view.state.selection.main.head;

	// inject whitespace and second brace for brace completion: {| } -> {{ | }}

	const isBraceCompletion =
		view.state.sliceDoc(cursor - 2, cursor) === '{{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isBraceCompletion) {
		view.dispatch({
			changes: { from: cursor, to: cursor + 2, insert: '  }' },
			selection: { anchor: cursor + 1 },
		});

		return true;
	}

	// inject whitespace for brace setup: empty -> {| }

	const isBraceSetup =
		view.state.sliceDoc(cursor - 1, cursor) === '{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isBraceSetup) {
		view.dispatch({ changes: { from: cursor, insert: ' ' } });

		return true;
	}

	// inject whitespace for brace completion from selection: {{abc|}} -> {{ abc| }}

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
 * CodeMirror plugin to handle double braces `{{ }}` for resolvables in n8n expressions.
 */
export const doubleBraceHandler = () => [inputHandler, bracketState];
