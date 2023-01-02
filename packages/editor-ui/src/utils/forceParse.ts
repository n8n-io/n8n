import { EditorView } from '@codemirror/view';

/**
 * Simulate user action to force parser to catch up during scroll.
 */
export function forceParse(_: Event, view: EditorView) {
	view.dispatch({
		changes: { from: view.viewport.to, insert: '_' },
	});

	view.dispatch({
		changes: { from: view.viewport.to - 1, to: view.viewport.to, insert: '' },
	});
}
