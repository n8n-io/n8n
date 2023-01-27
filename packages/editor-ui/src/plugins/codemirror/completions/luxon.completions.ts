import { i18n } from '@/plugins/i18n';
import { prefixMatch, longestCommonPrefix, splitBaseTail, stripExcessParens } from './utils';
import { DateTime } from 'luxon';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions offered at the end position of a Luxon entity.
 *
 * - `DateTime.`
 * - `$now.`
 * - `$today.`
 */
export function luxonCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/(DateTime|\$now|\$today)+\.[^.}]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const [base, tail] = splitBaseTail(word.text);

	let options = (base === 'DateTime' ? dateTimeOptions() : nowTodayOptions()).map(
		stripExcessParens(context),
	);

	if (tail !== '') {
		options = options.filter((o) => prefixMatch(o.label, tail));
	}

	if (options.length === 0) return null;

	return {
		from: word.to - tail.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(tail, completion.label);

			return [0, lcp.length];
		},
	};
}

export const nowTodayOptions = () => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	return Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				type: isFunction ? 'function' : 'keyword',
			};

			const info = i18n.luxonInstance[key];

			if (info) option.info = info;

			return option;
		});
};

export const dateTimeOptions = () => {
	const SKIP = new Set(['prototype', 'name', 'length', 'invalid']);

	return Object.keys(Object.getOwnPropertyDescriptors(DateTime))
		.filter((key) => !SKIP.has(key) && !key.includes('_'))
		.sort((a, b) => a.localeCompare(b))
		.map((key) => {
			const option: Completion = {
				label: key + '()',
				type: 'function',
			};

			const info = i18n.luxonStatic[key];

			if (info) option.info = info;

			return option;
		});
};
