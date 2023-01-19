import { resolveParameter } from '@/mixins/workflowHelpers';
import { longestCommonPrefix } from './utils';
import type { IDataObject } from 'n8n-workflow';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from `$json[` and `.json[` to their keys.
 */
export function jsonBracketCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$[\S]*json\[.*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const toResolve = word.text.split('[').shift();

	let resolved: IDataObject | null;

	try {
		resolved = resolveParameter(`={{ ${toResolve} }}`);
	} catch (_) {
		return null;
	}

	if (resolved === null) return null;

	let options = getJsonBracketOptions(resolved);

	const delimiter = word.text.startsWith('$json') ? '$json[' : '.json[';

	const userInputTail = word.text.split(delimiter).pop() ?? '';

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

function getJsonBracketOptions(resolved: IDataObject) {
	return Object.keys(resolved).map((key) => {
		return {
			label: `'${key}']`,
			type: 'keyword',
		};
	});
}
