import { i18n } from '@/plugins/i18n';
import { longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from alphabetic char, e.g. `D` -> `DateTime`.
 */
export function alphaCompletions(context: CompletionContext): CompletionResult | null {
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
	const emptyKeys = ['DateTime'];

	return emptyKeys.map((key) => {
		const option: Completion = {
			label: key,
			type: key.endsWith('()') ? 'function' : 'keyword',
		};

		const info = i18n.rootVars[key];

		if (info) option.info = info;

		return option;
	});
}
