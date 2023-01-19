import { i18n } from '@/plugins/i18n';
import { autocompletableNodeNames, inputHasNoBinaryData, longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from `$` to proxies.
 */
export function rootCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$\w*[^.}]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = generateOptions();

	const { text: userInput } = word;

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

export function generateOptions() {
	const BOOST_SET = new Set(['$input', '$json']);
	const SKIP_SET = new Set();

	if (inputHasNoBinaryData()) SKIP_SET.add('$binary');

	// @TODO: Add $parameter to i18n and remove here
	const rootKeys = [...Object.keys(i18n.rootVars), '$parameter'].sort((a, b) => {
		if (BOOST_SET.has(a)) return -1;
		if (BOOST_SET.has(b)) return 1;

		return a.localeCompare(b);
	});

	const options: Completion[] = rootKeys
		.filter((key) => !SKIP_SET.has(key))
		.map((key) => {
			const isFunction = ['$jmespath'].includes(key);

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
