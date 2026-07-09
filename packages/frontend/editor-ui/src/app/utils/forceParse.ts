import { Annotation } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export const ignoreUpdateAnnotation = Annotation.define<boolean>();

/**
 * Simulate user action to force parser to catch up during scroll.
 */
export function forceParse(view: EditorView) {
	view.dispatch({
		changes: { from: view.viewport.to, insert: '_' },
		annotations: [ignoreUpdateAnnotation.of(true)],
	});

	view.dispatch({
		changes: { from: view.viewport.to - 1, to: view.viewport.to, insert: '' },
		annotations: [ignoreUpdateAnnotation.of(true)],
	});
}
