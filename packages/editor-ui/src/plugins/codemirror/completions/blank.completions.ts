import { longestCommonPrefix } from './utils';
import { generateOptions as generateRootOptions } from './root.completions';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from blank position: {{ | }}
 */
export function blankCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\{\{\s/);

	const afterCursor = context.state.doc.slice(context.pos, context.pos + ' }}'.length).toString();

	if (!word || afterCursor !== ' }}') return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = generateRootOptions();

	const userInput = word.text.replace(/^{{/, '').trim();

	if (userInput.length > 0) {
		options = options.filter((o) => o.label.startsWith(userInput) && userInput !== o.label);
	}

	return {
		from: word.to - userInput.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix([userInput, completion.label]);

			return [0, lcp.length];
		},
	};
}
