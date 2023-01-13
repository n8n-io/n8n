import { ExpressionExtensions, IDataObject } from 'n8n-workflow';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { longestCommonPrefix } from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

/**
 * Completions from datatypes to native JS methods (pending) and expression extensions.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
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

	// remove opening marker grabbed by `objectRegex`, @TODO: negative lookbehind instead
	if (word.text.startsWith('{{')) word.text = word.text.replace(/^{{/, '');

	const toResolve = word.text.endsWith('.')
		? word.text.slice(0, -1)
		: word.text.split('.').slice(0, -1).join('.');

	/**
	 * n8n vars that should not trigger datatype completions
	 */
	const SKIP_SET = new Set(['$execution', '$binary', '$itemIndex', '$now', '$today', '$runIndex']);

	if (SKIP_SET.has(toResolve)) return null;

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
		options = extensionOptions('Array');
	} else if (resolved instanceof Date) {
		options = extensionOptions('Date');
	} else if (
		typeof resolved === 'object' &&
		!resolved.isProxy &&
		!resolved.json &&
		!toResolve.endsWith('json') &&
		!toResolve.startsWith('{') &&
		!toResolve.endsWith('}')
	) {
		/**
		 * Object expression extensions are _only_ completed for
		 * - bracketed object literals: `({}).`
		 * - referenced objects: `$input.item.json.myObj.`
		 */
		options = extensionOptions('Object');
	}

	let userInputTail = '';

	const delimiter = word.text.includes('json[') ? 'json[' : '.';

	userInputTail = word.text.split(delimiter).pop() as string;

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

	const options = Object.values(extensions.functions)
		.filter((f) => f.length === 1) // @TEMP Filter out functions needing args until documented
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((f) => {
			const option: Completion = {
				label: f.name,
				type: 'function',
			};

			if (f.description) option.info = f.description;

			return option;
		});

	return options;
};
