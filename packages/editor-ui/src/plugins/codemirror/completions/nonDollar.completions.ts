import { i18n } from '@/plugins/i18n';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { prefixMatch } from './utils';

/**
 * Completions offered at the initial position for any char other than `$`.
 *
 * Currently only `D...` for `DateTime` and `M...` for `Math`
 */
export function nonDollarCompletions(context: CompletionContext): CompletionResult | null {
	const dateTime = /(\s+)D[ateTim]*/;
	const math = /(\s+)M[ath]*/;

	const combinedRegex = new RegExp([dateTime.source, math.source].join('|'));

	const word = context.matchBefore(combinedRegex);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const userInput = word.text.trim();

	const nonDollarOptions = [
		{
			label: 'DateTime',
			type: 'keyword',
			info: i18n.rootVars.DateTime,
		},
		{
			label: 'Math',
			type: 'keyword',
			info: i18n.rootVars.DateTime,
		},
	];

	const options = nonDollarOptions.filter((o) => prefixMatch(o.label, userInput));

	return {
		from: word.to - userInput.length,
		filter: false,
		options,
	};
}
