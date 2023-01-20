import { i18n } from '@/plugins/i18n';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions offered at the base position for any char other than `$`.
 *
 * Currently only `D` for `DateTime`.
 */
export function nonDollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/(\s+)D[ateTim]*/); // loose charset but covered by CodeMirror's filter

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const userInput = word.text.trim();

	return {
		from: word.to - userInput.length,
		options: [
			{
				label: 'DateTime',
				type: 'keyword',
				info: i18n.rootVars.DateTime,
			},
		],
	};
}
