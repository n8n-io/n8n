import type { EditorView } from '@codemirror/view';

import type { Resolvable } from '@/app/types/expressions';

/**
 * Replace a diagnosed resolvable with its suggested expression (X-Ray "Fix").
 * Segment offsets can't be trusted here: ExpressionOutput remaps `from`/`to`
 * to output-doc coordinates in place, so locate the resolvable text in the
 * live document instead. Identical resolvables get identical diagnoses, so
 * fixing the first occurrence is always a correct step.
 */
export function applyExpressionSuggestion(view: EditorView, segment: Resolvable): void {
	const suggestion = segment.diagnosis?.suggestion;
	if (!suggestion) return;

	const from = view.state.doc.toString().indexOf(segment.resolvable);
	if (from === -1) return;

	view.dispatch({ changes: { from, to: from + segment.resolvable.length, insert: suggestion } });
}
