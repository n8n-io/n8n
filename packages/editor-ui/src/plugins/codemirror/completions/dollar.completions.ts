import { i18n } from '@/plugins/i18n';
import {
	autocompletableNodeNames,
	receivesNoBinaryData,
	longestCommonPrefix,
	bringForward,
} from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions offered at the dollar position: `$`
 *
 * Negative charset `[^.}]` ensures match stays within resolvable boundaries.
 */
export function dollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$\w*[^.}]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = generateDollarOptions();

	const userInput = word.text;

	/**
	 * If user typed anything after `$`, narrow down options based on
	 * left-to-right match of options to user input.
	 */
	if (userInput !== '$') {
		options = options.filter((o) => o.label.startsWith(userInput) && userInput !== o.label);
	}

	return {
		from: word.to - userInput.length,
		options,
		filter: false,

		/**
		 * Compute underline range based on left-to-right match.
		 */
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix([userInput, completion.label]);

			return [0, lcp.length];
		},
	};
}

export function generateDollarOptions() {
	const BOOST = ['$input', '$json'];
	const SKIP = new Set();
	const FUNCTIONS = ['$jmespath'];

	if (receivesNoBinaryData()) SKIP.add('$binary');

	const keys = Object.keys(i18n.rootVars).sort((a, b) => a.localeCompare(b));

	const options = bringForward(keys, BOOST)
		.filter((key) => !SKIP.has(key))
		.map((key) => {
			const isFunction = FUNCTIONS.includes(key);

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				type: isFunction ? 'function' : 'keyword',
			};

			const info = i18n.rootVars[key];

			if (info) option.info = info;

			return option;
		});

	options.push(
		...autocompletableNodeNames().map((nodeName) => ({
			label: `$('${nodeName}')`,
			type: 'keyword',
			info: i18n.baseText('codeNodeEditor.completer.$()', { interpolate: { nodeName } }),
		})),
	);

	return options;
}
