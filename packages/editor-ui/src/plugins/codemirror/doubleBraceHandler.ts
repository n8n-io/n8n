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
	 * Customizations to inject whitespace and braces
	 * for resolvable setup and completion
	 */

	const cursor = view.state.selection.main.head;

	// inject whitespace and second brace on completion: {| } -> {{ | }}

	const isSecondBraceForNewExpression =
		view.state.sliceDoc(cursor - 2, cursor) === '{{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isSecondBraceForNewExpression) {
		view.dispatch({
			changes: { from: cursor, to: cursor + 2, insert: '  }' },
			selection: { anchor: cursor + 1 },
		});

		return true;
	}

	// inject whitespace on setup: empty -> {| }

	const isFirstBraceForNewExpression =
		view.state.sliceDoc(cursor - 1, cursor) === '{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isFirstBraceForNewExpression) {
		view.dispatch({ changes: { from: cursor, insert: ' ' } });

		return true;
	}

	// when selected, surround with whitespaces on completion: {{abc}} -> {{ abc }}

	const doc = view.state.doc.toString();
	const openMarkerIndex = doc.lastIndexOf('{', cursor);
	const closeMarkerIndex = doc.indexOf('}}', cursor);

	if (openMarkerIndex !== -1 && closeMarkerIndex !== -1) {
		view.dispatch(
			{ changes: { from: openMarkerIndex + 1, insert: ' ' } },
			{ changes: { from: closeMarkerIndex, insert: ' ' } },
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
