import { dollarOptions } from './dollar.completions';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { stripExcessParens } from './utils';

/**
 * Completions offered at the blank position: `{{ | }}`
 */
export async function blankCompletions(
	context: CompletionContext,
): Promise<CompletionResult | null> {
	const word = context.matchBefore(/\{\{\s/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const afterCursor = context.state.sliceDoc(context.pos, context.pos + ' }}'.length);

	if (afterCursor !== ' }}') return null;

	return {
		from: word.to,
		options: (await dollarOptions(context)).map(stripExcessParens(context)),
		filter: false,
	};
}
