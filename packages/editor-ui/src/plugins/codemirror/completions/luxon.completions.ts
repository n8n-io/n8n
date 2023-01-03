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
	if (toResolve === '$now' || toResolve === '$today') {
		const propertyNamesToSkip = new Set(['constructor', 'get']);

		const entries = Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
			.filter(([propertyName]) => !propertyNamesToSkip.has(propertyName))
			.sort(([first], [second]) => first.localeCompare(second));

		return entries.map(([propertyName, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';

			const option: Completion = {
				label: isFunction ? `${propertyName}()` : propertyName,
				type: isFunction ? 'function' : 'keyword',
			};

			const info = i18n.luxonInstance[propertyName];

			if (info) option.info = info;

			return option;
		});
	}

	if (toResolve === 'DateTime') {
		const propertyNamesToSkip = new Set(['prototype', 'name', 'length']);

		return Object.entries(Object.getOwnPropertyDescriptors(DateTime))
			.filter(
				([propertyName]) => !propertyNamesToSkip.has(propertyName) && !propertyName.includes('_'),
			)
			.map(([propertyName, descriptor]) => {
				const isFunction = typeof descriptor.value === 'function';

				const option: Completion = {
					label: isFunction ? `${propertyName}()` : propertyName,
					type: isFunction ? 'function' : 'keyword',
				};

				const info = i18n.luxonStatic[propertyName];

				if (info) option.info = info;

				return option;
			});
	}

	return [];
}
