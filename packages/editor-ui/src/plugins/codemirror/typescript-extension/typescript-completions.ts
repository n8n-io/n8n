import { completeFromList } from '@codemirror/autocomplete';
import type { CompletionContext } from '@codemirror/autocomplete';
import { tsProjectField } from './typescript-project-field';

export const tsCompletions = async (context: CompletionContext) => {
	const { state, pos } = context;
	const completions = await state.field(tsProjectField).getCompletions(pos);

	if (!completions) return null;

	const options = completions.entries.map((c) => ({
		type: c.kind,
		label: c.name,
		boost: 1 / parseInt(c.sortText),
		// @TODO: Add entry details
	}));

	if (state.sliceDoc(pos - 1, pos) === '.') {
		return { from: pos, options };
	}

	return await completeFromList(options)(context);
};
