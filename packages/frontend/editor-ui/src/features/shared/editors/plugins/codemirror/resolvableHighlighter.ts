import type { DecorationSet } from '@codemirror/view';
import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect, RangeSet } from '@codemirror/state';
import type { Range } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { captureException } from '@sentry/vue';

import { ignoreUpdateAnnotation } from '@/app/utils/forceParse';
import type {
	ColoringStateEffect,
	Plaintext,
	Resolvable,
	ResolvableState,
} from '@/app/types/expressions';

const cssClasses = {
	validResolvable: 'cm-valid-resolvable',
	invalidResolvable: 'cm-invalid-resolvable',
	pendingResolvable: 'cm-pending-resolvable',
	plaintext: 'cm-plaintext',
};

const resolvablesTheme = EditorView.theme({
	['.' + cssClasses.validResolvable]: {
		color: 'var(--expression-editor--resolvable--color--foreground--valid)',
		backgroundColor: 'var(--expression-editor--resolvable--color--background--valid)',
	},
	['.' + cssClasses.invalidResolvable]: {
		color: 'var(--expression-editor--resolvable--color--foreground--invalid)',
		backgroundColor: 'var(--expression-editor--resolvable--color--background--invalid)',
	},
	['.' + cssClasses.pendingResolvable]: {
		color: 'var(--expression-editor--resolvable--color--foreground--pending)',
		backgroundColor: 'var(--expression-editor--resolvable--color--background--pending)',
	},
});

const resolvableStateToDecoration: Record<ResolvableState, Decoration> = {
	valid: Decoration.mark({ class: cssClasses.validResolvable }),
	invalid: Decoration.mark({ class: cssClasses.invalidResolvable }),
	pending: Decoration.mark({ class: cssClasses.pendingResolvable }),
};

// Exported for testing — keeps the field re-usable across editor instances
// while letting unit tests dispatch transactions and inspect the resulting
// decoration set without going through a real EditorView.
export const coloringStateEffects = {
	addColorEffect: StateEffect.define<ColoringStateEffect.Value>({
		map: ({ from, to, kind, state }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
			kind,
			state,
		}),
	}),
	removeColorEffect: StateEffect.define<ColoringStateEffect.Value>({
		map: ({ from, to }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
		}),
	}),
};

// Exported for testing — keeps the field re-usable across editor instances
// while letting unit tests dispatch transactions and inspect the resulting
// decoration set without going through a real EditorView.
export const coloringStateField = StateField.define<DecorationSet>({
	provide: (stateField) => EditorView.decorations.from(stateField),
	create() {
		return Decoration.none;
	},
	update(colorings, transaction) {
		try {
			const isSynthetic = transaction.annotation(ignoreUpdateAnnotation) === true;
			if (!transaction.changes.empty) {
				if (isSynthetic) {
					colorings = colorings.map(transaction.changes);
					// Clean up zero-length decorations left behind by the synthetic insert/delete
					if (colorings.size > 0) {
						const surviving: Range<Decoration>[] = [];
						const cursor = colorings.iter();
						while (cursor.value !== null) {
							if (cursor.from !== cursor.to) {
								surviving.push(cursor.value.range(cursor.from, cursor.to));
							}
							cursor.next();
						}
						colorings = RangeSet.of(surviving);
					}
				} else {
					colorings = Decoration.none;
				}
			}

			for (const txEffect of transaction.effects) {
				if (txEffect.is(coloringStateEffects.removeColorEffect)) {
					colorings = colorings.update({
						filter: (from, to) => txEffect.value.from !== from && txEffect.value.to !== to,
					});
				}

				if (txEffect.is(coloringStateEffects.addColorEffect)) {
					colorings = colorings.update({
						filter: (from, to) => txEffect.value.from !== from && txEffect.value.to !== to,
					});

					const decoration = resolvableStateToDecoration[txEffect.value.state ?? 'pending'];

					if (txEffect.value.from === 0 && txEffect.value.to === 0) continue;

					colorings = colorings.update({
						add: [decoration.range(txEffect.value.from, txEffect.value.to)],
					});
				}
			}
		} catch (error) {
			captureException(error);
		}

		return colorings;
	},
});

function addColor(view: EditorView, segments: Resolvable[]) {
	const effects: Array<StateEffect<unknown>> = segments.map(({ from, to, kind, state }) =>
		coloringStateEffects.addColorEffect.of({ from, to, kind, state }),
	);

	if (effects.length === 0) return;

	if (!view.state.field(coloringStateField, false)) {
		effects.push(StateEffect.appendConfig.of([coloringStateField, resolvablesTheme]));
	}

	view.dispatch({ effects });
}

function removeColor(view: EditorView, segments: Plaintext[]) {
	const effects: Array<StateEffect<unknown>> = segments.map(({ from, to }) =>
		coloringStateEffects.removeColorEffect.of({ from, to }),
	);

	if (effects.length === 0) return;

	if (!view.state.field(coloringStateField, false)) {
		effects.push(StateEffect.appendConfig.of([coloringStateField, resolvablesTheme]));
	}

	view.dispatch({ effects });
}

const resolvableStyle = syntaxHighlighting(
	HighlightStyle.define([
		{
			tag: tags.content,
			class: cssClasses.plaintext,
		},
		/**
		 * CSS classes for valid and invalid resolvables
		 * dynamically applied based on state fields
		 */
	]),
);

export const highlighter = {
	addColor,
	removeColor,
	resolvableStyle,
};
