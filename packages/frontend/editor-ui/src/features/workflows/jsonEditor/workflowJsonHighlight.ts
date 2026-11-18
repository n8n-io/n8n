import { StateEffect, StateField, type Extension, type Range } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';

import type { TextRange } from './workflowJson.types';

export const setHighlightedRanges = StateEffect.define<TextRange[]>();

const selectedLine = Decoration.line({ class: 'cm-wfjson-selected' });

const highlightField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(decorations, tr) {
		const effect = tr.effects.find((e) => e.is(setHighlightedRanges));
		if (!effect?.is(setHighlightedRanges)) return decorations.map(tr.changes);

		const { doc } = tr.state;
		const lines = new Set(
			effect.value.flatMap(({ from, to }) => {
				const first = doc.lineAt(from).number;
				const last = doc.lineAt(to).number;
				return Array.from({ length: last - first + 1 }, (_, i) => first + i);
			}),
		);
		const ranges: Array<Range<Decoration>> = [...lines]
			.sort((a, b) => a - b)
			.map((lineNumber) => selectedLine.range(doc.line(lineNumber).from));
		return Decoration.set(ranges);
	},
	provide: (field) => EditorView.decorations.from(field),
});

export const selectedNodeHighlight = (): Extension => [
	highlightField,
	EditorView.theme({
		'.cm-wfjson-selected': { backgroundColor: 'var(--canvas--color--selected-transparent)' },
		'.cm-panels-top': { borderBottom: 'var(--border)' },
	}),
];
