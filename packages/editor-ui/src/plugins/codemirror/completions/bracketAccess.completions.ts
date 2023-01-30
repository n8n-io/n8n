import { resolveParameter } from '@/mixins/workflowHelpers';
import { prefixMatch, longestCommonPrefix } from './utils';
import type { IDataObject } from 'n8n-workflow';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Resolved } from './types';

/**
 * Resolution-based completions offered at the start of bracket access notation.
 *
 * - `$json[|`
 * - `$input.item.json[|`
 * - `$json['field'][|`
 * - `$json.myObj[|`
 * - `$('Test').last().json.myArr[|`
 * - `$input.first().json.myStr[|`
 */
export function bracketAccessCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$[\S\s]*\[.*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const skipBracketAccessCompletions = ['$input[', '$now[', '$today['];

	if (skipBracketAccessCompletions.includes(word.text)) return null;

	const base = word.text.substring(0, word.text.lastIndexOf('['));
	const tail = word.text.split('[').pop() ?? '';

	let resolved: Resolved;

	try {
		resolved = resolveParameter(`={{ ${base} }}`);
	} catch (_) {
		return null;
	}

	if (resolved === null || resolved === undefined) return null;

	let options = bracketAccessOptions(resolved);

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

function bracketAccessOptions(resolved: IDataObject) {
	const SKIP = new Set(['__ob__', 'pairedItem']);

	return Object.keys(resolved)
		.filter((key) => !SKIP.has(key))
		.map((key) => {
			const isNumber = !isNaN(parseInt(key)); // array or string index

			return {
				label: isNumber ? `${key}]` : `'${key}']`,
				type: 'keyword',
			};
		});
}
