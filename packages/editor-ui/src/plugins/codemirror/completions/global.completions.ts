import { i18n } from '@/plugins/i18n';
import { longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions for global vars, e.g. `D` -> `DateTime`.
 */
export function globalCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/(\s+)D[ateTim]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = generateOptions();

	const userInput = word.text.trim();

	if (userInput !== '' && userInput !== '$') {
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

function generateOptions() {
	const ALPHABETIC_KEYS = ['DateTime'];

	return ALPHABETIC_KEYS.map((key) => {
		const option: Completion = {
			label: key,
			type: 'keyword',
		};

		const info = i18n.rootVars[key];

		if (info) option.info = info;

		return option;
	});
}
