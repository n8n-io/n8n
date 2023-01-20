import { ExpressionExtensions, IDataObject } from 'n8n-workflow';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { isAllowedInDotNotation, longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from datatypes to expression extensions.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	// ----------------------------------
	//        match before cursor
	// ----------------------------------

	const referenceRegex = /\$[\S]+\.([^{\s])*/; // $input.
	const numberRegex = /(\d+)\.?(\d*)\.([^{\s])*/; // 123. or 123.4.
	const stringRegex = /(".+"|('.+'))\.([^{\s])*/; // 'abc'. or "abc".
	const arrayRegex = /(\[.+\])\.([^{\s])*/; // [1, 2, 3].
	const objectRegex = /\(\{.*\}\)\.([^{\s])*/; // ({}).
	const dateRegex = /\(?new Date\(\(?.*?\)\)?\.([^{\s])*/; // new Date(). or (new Date()).

	const combinedRegex = new RegExp(
		[
			referenceRegex.source,
			numberRegex.source,
			stringRegex.source,
			arrayRegex.source,
			objectRegex.source,
			dateRegex.source,
		].join('|'),
	);

	const word = context.matchBefore(combinedRegex);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	// ----------------------------------
	//      find string to resolve
	// ----------------------------------

	const toResolve = word.text.endsWith('.')
		? word.text.slice(0, -1)
		: word.text.split('.').slice(0, -1).join('.');

	const SKIP_SET = new Set(['$execution', '$binary', '$itemIndex', '$now', '$today', '$runIndex']);

	if (SKIP_SET.has(toResolve)) return null;

	// ----------------------------------
	//     resolve and get options
	// ----------------------------------

	let resolved: IDataObject | null;

	try {
		resolved = resolveParameter(`={{ ${toResolve} }}`);
	} catch (_) {
		return null;
	}

	if (resolved === null) return null;

	let options = getDatatypeOptions(resolved, toResolve);

	if (options.length === 0) return null;

	// ----------------------------------
	//       filter by user input
	// ----------------------------------

	const userInputTail = word.text.split('.').pop() ?? '';

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

function getDatatypeOptions(resolved: IDataObject, toResolve: string) {
	if (typeof resolved === 'number') return extensionOptions('Number');

	if (typeof resolved === 'string') return extensionOptions('String');

	if (resolved instanceof Date) return extensionOptions('Date');

	if (Array.isArray(resolved)) {
		const isProxy = toResolve.endsWith('all()');

		if (isProxy) return [];

		return extensionOptions('Array');
	}

	if (typeof resolved === 'object') {
		const isProxy =
			resolved.isProxy ||
			resolved.json ||
			toResolve.endsWith('json') ||
			toResolve.startsWith('{') ||
			toResolve.endsWith('}');

		if (isProxy) return [];

		// @TODO: completions for bracket-notation chain e.g. $json['obj']['my Key']

		const keys = Object.keys(resolved)
			.filter((key) => isAllowedInDotNotation(key))
			.map((key) => ({ label: key, type: 'keyword' }));

		return [...keys, ...extensionOptions('Object')];
	}

	return [];
}

const extensionOptions = (typeName: 'String' | 'Number' | 'Date' | 'Object' | 'Array') => {
	const extensions = ExpressionExtensions.find((ee) => ee.typeName === typeName);

	if (!extensions) return [];

	const options = Object.entries(extensions.functions)
		.filter(([_, fn]) => fn.length === 1) // complete only argless functions for now
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([name, f]) => {
			const option: Completion = {
				label: name + '()',
				type: 'function',
			};

			// @TODO
			// if (f.description) option.info = f.description;

			return option;
		});

	return options;
};
