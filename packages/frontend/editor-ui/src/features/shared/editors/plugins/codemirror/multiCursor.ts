import { EditorSelection } from '@codemirror/state';
import type { Command } from '@codemirror/view';

const createAddCursor =
	(direction: 'up' | 'down'): Command =>
	(view) => {
		const forward = direction === 'down';

		let selection = view.state.selection;

		for (const r of selection.ranges) {
			selection = selection.addRange(view.moveVertically(r, forward));
		}

		view.dispatch({ selection });

		return true;
	};

export const addCursorUp = createAddCursor('up');
export const addCursorDown = createAddCursor('down');

export const addCursorAtEachSelectionLine: Command = (view) => {
	let selection: EditorSelection | null = null;
	for (const r of view.state.selection.ranges) {
		if (r.empty) {
			continue;
		}

		for (let pos = r.from; pos <= r.to; ) {
			const line = view.state.doc.lineAt(pos);

			const anchor = Math.min(line.to, r.to);

			if (selection) {
				selection = selection.addRange(EditorSelection.range(anchor, anchor));
			} else {
				selection = EditorSelection.single(anchor);
			}

			pos = line.to + 1;
		}
	}

	if (!selection) {
		return false;
	}

	view.dispatch({ selection });

	return true;
};
