import { i18n } from '@/plugins/i18n';
import { longestCommonPrefix } from './utils';
import { DateTime } from 'luxon';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

export function luxonCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/(DateTime|\$(now|today)*)\.(\w|\.|\(|\))*/); //

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const toResolve = word.text.endsWith('.')
		? word.text.slice(0, -1)
		: word.text.split('.').slice(0, -1).join('.');

	let options = generateOptions(toResolve);

	const userInputTail = word.text.split('.').pop();

	if (userInputTail === undefined) return null;

	if (userInputTail !== '') {
		options = options.filter((o) => o.label.startsWith(userInputTail) && userInputTail !== o.label);
	}

	return {
		from: word.to - userInputTail.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix([userInputTail, completion.label]);

			return [0, lcp.length];
		},
	};
}

function generateOptions(toResolve: string): Completion[] {
	if (toResolve === '$now' || toResolve === '$today') return nowTodayOptions();
	if (toResolve === 'DateTime') return dateTimeOptions();

	return [];
}

export const nowTodayOptions = () => {
	const SKIP_SET = new Set(['constructor', 'get']);

	const entries = Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP_SET.has(key))
		.sort(([a], [b]) => a.localeCompare(b));

	return entries.map(([key, descriptor]) => {
		const isFunction = typeof descriptor.value === 'function';

		const option: Completion = {
			label: isFunction ? `${key}()` : key,
			type: isFunction ? 'function' : 'keyword',
		};

		const info = i18n.luxonInstance[key];

		if (info) option.info = info;

		return option;
	});
};

export const dateTimeOptions = () => {
	const SKIP_SET = new Set(['prototype', 'name', 'length']);

	const keys = Object.keys(Object.getOwnPropertyDescriptors(DateTime))
		.filter((key) => !SKIP_SET.has(key) && !key.includes('_'))
		.sort((a, b) => a.localeCompare(b));

	return keys.map((key) => {
		const option: Completion = { label: `${key}()`, type: 'function' };
		const info = i18n.luxonStatic[key];

		if (info) option.info = info;

		return option;
	});
};
