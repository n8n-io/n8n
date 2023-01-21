import { i18n } from '@/plugins/i18n';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { prefixMatch } from './utils';

/**
 * Completions offered at the base position for any char other than `$`.
 *
 * Currently only `D` for `DateTime`.
 */
export function nonDollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/(\s+)D[ateTim]*/); // loose charset but covered by filter

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const userInput = word.text.trim();

	const options = [
		{
			label: 'DateTime',
			type: 'keyword',
			info: i18n.rootVars.DateTime,
		},
	].filter((o) => prefixMatch(o.label, userInput));

	return {
		from: word.to - userInput.length,
		filter: false,
		options,
	};
}
