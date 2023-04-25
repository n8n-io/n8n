import type { DecorationSet } from '@codemirror/view';
import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';

import type { ColoringStateEffect, Plaintext, Resolvable, Resolved } from '@/types/expressions';

const cssClasses = {
	validResolvable: 'cm-valid-resolvable',
	invalidResolvable: 'cm-invalid-resolvable',
	brokenResolvable: 'cm-broken-resolvable',
	plaintext: 'cm-plaintext',
};

const resolvablesTheme = EditorView.theme({
	['.' + cssClasses.validResolvable]: {
		color: 'var(--color-valid-resolvable-foreground)',
		backgroundColor: 'var(--color-valid-resolvable-background)',
	},
	['.' + cssClasses.invalidResolvable]: {
		color: 'var(--color-invalid-resolvable-foreground)',
		backgroundColor: 'var(--color-invalid-resolvable-background)',
	},
});

const marks = {
	valid: Decoration.mark({ class: cssClasses.validResolvable }),
	invalid: Decoration.mark({ class: cssClasses.invalidResolvable }),
};

const coloringStateEffects = {
	addColorEffect: StateEffect.define<ColoringStateEffect.Value>({
		map: ({ from, to, kind, error }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
			kind,
			error,
		}),
	}),
	removeColorEffect: StateEffect.define<ColoringStateEffect.Value>({
		map: ({ from, to }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
		}),
	}),
};

const coloringStateField = StateField.define<DecorationSet>({
	provide: (stateField) => EditorView.decorations.from(stateField),
	create() {
		return Decoration.none;
	},
	update(colorings, transaction) {
		colorings = colorings.map(transaction.changes); // recalculate positions for new doc

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

				const decoration = txEffect.value.error ? marks.invalid : marks.valid;

				if (txEffect.value.from === 0 && txEffect.value.to === 0) continue;

				colorings = colorings.update({
					add: [decoration.range(txEffect.value.from, txEffect.value.to)],
				});
			}
		}

		return colorings;
	},
});

function addColor(view: EditorView, segments: Array<Resolvable | Resolved>) {
	const effects: Array<StateEffect<unknown>> = segments.map(({ from, to, kind, error }) =>
		coloringStateEffects.addColorEffect.of({ from, to, kind, error }),
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
		{
			tag: tags.className,
			class: cssClasses.brokenResolvable,
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
