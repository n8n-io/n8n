import { i18n } from '@/plugins/i18n';
import { longestCommonPrefix } from './utils';
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
	const word = context.matchBefore(/(DateTime|\$now|\$today)+\.[^}]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const [base, tail] = splitBaseTail(word.text);

	let options = base === 'DateTime' ? dateTimeOptions() : nowTodayOptions();

	/**
	 * If user typed anything after `.`, narrow down options based on
	 * left-to-right match of options to user input.
	 */
	if (tail !== '') {
		options = options.filter((o) => o.label.startsWith(tail) && tail !== o.label);
	}

	return {
		from: word.to - tail.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix([tail, completion.label]);

			return [0, lcp.length];
		},
	};
}

export const nowTodayOptions = () => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	const map = Object.getOwnPropertyDescriptors(DateTime.prototype);

	const entries = Object.entries(map)
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b));

	return entries.map(([key, descriptor]) => {
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

	const map = Object.getOwnPropertyDescriptors(DateTime);

	const keys = Object.keys(map)
		.filter((key) => !SKIP.has(key) && !key.includes('_'))
		.sort((a, b) => a.localeCompare(b));

	return keys.map((key) => {
		const option: Completion = { label: key + '()', type: 'function' };
		const info = i18n.luxonStatic[key];

		if (info) option.info = info;

		return option;
	});
};

/**
 * Split user input into base (Luxon entity) and tail (trailing section for filtering).
 *
 * ```
 * DateTime. -> ['DateTime', '']
 * DateTime.fr -> ['DateTime', 'fr']
 * ```
 */
function splitBaseTail(userInput: string): [string, string] {
	const parts = userInput.split('.');

	const [tail, ...base] = parts.reverse();

	return [base.join('.'), tail];
}
