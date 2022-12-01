import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

import { DYNAMICALLY_STYLED_RESOLVABLES_THEME, SYNTAX_HIGHLIGHTING_CLASSES } from './theme';

import type { ColoringStateEffect, Plaintext, Resolvable, Resolved } from './types';

const stateEffects = {
	addColor: StateEffect.define<ColoringStateEffect.Value>({
		map: ({ from, to, kind, error }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
			kind,
			error,
		}),
	}),
	removeColor: StateEffect.define<{ from: number; to: number }>({
		map: ({ from, to }, change) => ({
			from: change.mapPos(from),
			to: change.mapPos(to),
		}),
	}),
};

const marks = {
	valid: Decoration.mark({ class: SYNTAX_HIGHLIGHTING_CLASSES.validResolvable }),
	invalid: Decoration.mark({ class: SYNTAX_HIGHLIGHTING_CLASSES.invalidResolvable }),
};

const coloringField = StateField.define<DecorationSet>({
	provide: (stateField) => EditorView.decorations.from(stateField),
	create() {
		return Decoration.none;
	},
	update(colorings, transaction) {
		colorings = colorings.map(transaction.changes);

		for (const txEffect of transaction.effects) {
			if (txEffect.is(stateEffects.removeColor)) {
				colorings = colorings.update({
					filter: (from, to) => txEffect.value.from !== from && txEffect.value.to !== to,
				});
			}

			if (txEffect.is(stateEffects.addColor)) {
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

export function addColor(view: EditorView, segments: Array<Resolvable | Resolved>) {
	const effects: Array<StateEffect<unknown>> = segments.map(({ from, to, kind, error }) =>
		stateEffects.addColor.of({ from, to, kind, error }),
	);

	if (effects.length === 0) return;

	if (!view.state.field(coloringField, false)) {
		effects.push(
			StateEffect.appendConfig.of([coloringField, DYNAMICALLY_STYLED_RESOLVABLES_THEME]),
		);
	}

	view.dispatch({ effects });
}

export function removeColor(view: EditorView, segments: Plaintext[]) {
	const effects: Array<StateEffect<unknown>> = segments.map(({ from, to }) =>
		stateEffects.removeColor.of({ from, to }),
	);

	if (effects.length === 0) return;

	if (!view.state.field(coloringField, false)) {
		effects.push(
			StateEffect.appendConfig.of([coloringField, DYNAMICALLY_STYLED_RESOLVABLES_THEME]),
		);
	}

	view.dispatch({ effects });
}
