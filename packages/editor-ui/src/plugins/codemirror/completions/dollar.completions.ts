import { i18n } from '@/plugins/i18n';
import {
	autocompletableNodeNames,
	receivesNoBinaryData,
	longestCommonPrefix,
	setRank,
	prefixMatch,
	stripExcessParens,
	hasActiveNode,
} from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions offered at the dollar position: `$|`
 */
export function dollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$[^$]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = dollarOptions().map(stripExcessParens(context));

	const userInput = word.text;

	if (userInput !== '$') {
		options = options.filter((o) => prefixMatch(o.label, userInput));
	}

	if (options.length === 0) return null;

	return {
		from: word.to - userInput.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(userInput, completion.label);

			return [0, lcp.length];
		},
	};
}

export function dollarOptions() {
	const rank = setRank(['$json', '$input']);
	const SKIP = new Set();
	const DOLLAR_FUNCTIONS = ['$jmespath'];

	if (!hasActiveNode()) return []; // e.g. credential modal

	if (receivesNoBinaryData()) SKIP.add('$binary');

	const keys = Object.keys(i18n.rootVars).sort((a, b) => a.localeCompare(b));

	return rank(keys)
		.filter((key) => !SKIP.has(key))
		.map((key) => {
			const isFunction = DOLLAR_FUNCTIONS.includes(key);

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				type: isFunction ? 'function' : 'keyword',
			};

			const info = i18n.rootVars[key];

			if (info) option.info = info;

			return option;
		})
		.concat(
			autocompletableNodeNames().map((nodeName) => ({
				label: `$('${nodeName}')`,
				type: 'keyword',
				info: i18n.baseText('codeNodeEditor.completer.$()', { interpolate: { nodeName } }),
			})),
		);
}
