import { ExpressionExtensions, IDataObject } from 'n8n-workflow';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from datatypes to native JS methods (pending) and expression extensions.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	// ----------------------------------
	//        match before cursor
	// ----------------------------------

	const referenceRegex = /\$[\S]+\.(\w|\W)*/; // $input.item.json.name.
	const numberRegex = /(\d+)\.?(\d*)\.(\w|\W)*/; // 123. or 123.4.
	const stringRegex = /(".+"|('.+'))\.(\w|\W)*/; // 'abc'. or "abc".
	const arrayRegex = /(\[.+\])\.(\w|\W)*/; // [1, 2, 3].
	const objectRegex = /(\{.*\})\.(\w|\W)*/; // ({}).
	const dateRegex = /\(?new Date\(\(?.*?\)\)?\.(\w|\W)*/; // new Date(). or (new Date()).

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

	// cleanup - remove opener grabbed by objectRegex
	if (word.text.startsWith('{{')) word.text = word.text.replace(/^{{/, '');

	// ----------------------------------
	//      find string to resolve
	// ----------------------------------

	const toResolve =
		word.text.endsWith('.') || word.text.endsWith('json[')
			? word.text.slice(0, -1)
			: word.text.split('.').slice(0, -1).join('.');

	// ----------------------------------
	//         skip exceptions
	// ----------------------------------

	const SKIP_SET = new Set(['$execution', '$binary', '$itemIndex', '$now', '$today', '$runIndex']);

	if (SKIP_SET.has(toResolve)) return null;

	// ----------------------------------
	//     resolve and get options
	// ----------------------------------

	let options: Completion[] = [];
	let resolved: IDataObject | null;

	try {
		resolved = resolveParameter(`={{ ${toResolve} }}`);
	} catch (_) {
		return null;
	}

	if (resolved === null) return null;

	if (typeof resolved === 'number') {
		options = extensionOptions('Number');
	} else if (typeof resolved === 'string') {
		options = extensionOptions('String');
	} else if (Array.isArray(resolved)) {
		if (toResolve.endsWith('all()')) {
			// exclude array proxy from array expression extensions
			return null;
		}
		options = extensionOptions('Array');
	} else if (resolved instanceof Date) {
		options = extensionOptions('Date');
	} else if (
		typeof resolved === 'object' &&
		// exclude object proxies from object expression extensions
		!resolved.isProxy &&
		!resolved.json &&
		!toResolve.endsWith('json') &&
		!toResolve.startsWith('{') &&
		!toResolve.endsWith('}')
	) {
		options = [
			...Object.keys(resolved).map((key) => ({ label: key, type: 'keyword' })),
			...extensionOptions('Object'),
		];
	} else if (word.text.endsWith('json[')) {
		options = Object.keys(resolved).map((key) => {
			return {
				label: `'${key}']`,
				type: 'keyword',
			};
		});
	}

	// ----------------------------------
	//       filter by user input
	// ----------------------------------

	const userInputTail = word.text.includes('json[') ? '' : word.text.split('.').pop() ?? '';

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

const extensionOptions = (typeName: 'String' | 'Number' | 'Date' | 'Object' | 'Array') => {
	const extensions = ExpressionExtensions.find((ee) => ee.typeName === typeName);

	if (!extensions) return [];

	const options = Object.entries(extensions.functions)
		.filter(([_, f]) => f.length === 1) // complete only argless functions until further notice
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([name, f]) => {
			const option: Completion = {
				label: name,
				type: 'function',
			};

			if (f.description) option.info = f.description;

			return option;
		});

	return options;
};
