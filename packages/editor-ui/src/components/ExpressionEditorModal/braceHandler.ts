import { closeBrackets, insertBracket } from '@codemirror/autocomplete';
import { codePointAt, codePointSize, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const braceInputHandler = EditorView.inputHandler.of((view, from, to, insert) => {
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

	// customization to rearrange spacing and cursor for expression

	const cursor = view.state.selection.main.head;

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

	const isFirstBraceForNewExpression =
		view.state.sliceDoc(cursor - 1, cursor) === '{' &&
		view.state.sliceDoc(cursor, cursor + 1) === '}';

	if (isFirstBraceForNewExpression) {
		view.dispatch({ changes: { from: cursor, insert: ' ' } });

		return true;
	}

	return true;
});

const [_, bracketState] = closeBrackets() as readonly Extension[];

export const braceHandler = () => [braceInputHandler, bracketState];
