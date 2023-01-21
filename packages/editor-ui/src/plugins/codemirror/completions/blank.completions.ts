import { dollarOptions } from './dollar.completions';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions offered at the blank position: `{{ | }}`
 */
export function blankCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\{\{\s/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const afterCursor = context.state.sliceDoc(context.pos, context.pos + ' }}'.length);

	if (afterCursor !== ' }}') return null;

	return {
		from: word.to,
		options: dollarOptions(),
		filter: false,
	};
}
