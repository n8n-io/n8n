import { ExpressionExtensions, IDataObject } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';
import { resolveParameter } from '@/mixins/workflowHelpers';
import {
	bringToStart,
	hasNoParams,
	prefixMatch,
	isAllowedInDotNotation,
	isSplitInBatchesAbsent,
	longestCommonPrefix,
	splitBaseTail,
	isPseudoParam,
} from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Resolved } from './types';

/**
 * Resolution-based completions offered according to datatype.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	const generalReference = /\$[\S]+\.([^{\s])*/; // $input.
	const nodeSelectorReference = /\$\(['"][\S\s]+['"]\)\..*/; // $('nodeName')
	const numberLiteral = /\((\d+)\.?(\d*)\)\.([^{\s])*/; // (123). or (123.4).
	const stringLiteral = /(".+"|('.+'))\.([^{\s])*/; // 'abc'. or "abc".
	const dateLiteral = /\(?new Date\(\(?.*?\)\)?\.([^{\s])*/; // new Date(). or (new Date()).
	const arrayLiteral = /(\[.+\])\.([^{\s])*/; // [1, 2, 3].
	const objectLiteral = /\(\{.*\}\)\.([^{\s])*/; // ({}).
	const mathGlobal = /Math\.([^{\s])*/; // Math.

	const combinedRegex = new RegExp(
		[
			generalReference.source,
			nodeSelectorReference.source,
			numberLiteral.source,
			stringLiteral.source,
			dateLiteral.source,
			arrayLiteral.source,
			objectLiteral.source,
			mathGlobal.source,
		].join('|'),
	);

	const word = context.matchBefore(combinedRegex);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const skipDatatypeCompletions = ['$now.', '$today.'];

	if (skipDatatypeCompletions.includes(word.text)) return null;

	const [base, tail] = splitBaseTail(word.text);

	let resolved: Resolved;

	try {
		resolved = resolveParameter(`={{ ${base} }}`);
	} catch (_) {
		return null;
	}

	if (resolved === null) return null;

	let options: Completion[] = [];

	try {
		options = datatypeOptions(resolved, base);
	} catch (_) {
		return null;
	}

	if (options.length === 0) return null;

	if (tail !== '') {
		options = options.filter((o) => prefixMatch(o.label, tail));
	}

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

function datatypeOptions(resolved: Resolved, toResolve: string) {
	if (resolved === null) return [];

	if (typeof resolved === 'number') return extensions('number');

	if (typeof resolved === 'string') return extensions('string');

	if (resolved instanceof Date) return extensions('date');

	if (Array.isArray(resolved)) {
		if (toResolve.endsWith('all()')) return [];

		return extensions('array');
	}

	if (typeof resolved === 'object') {
		const BOOST = ['item', 'all', 'first', 'last'];
		const SKIP = new Set(['__ob__', 'pairedItem']);

		if (isSplitInBatchesAbsent()) SKIP.add('context');

		const name = toResolve.startsWith('$(') ? '$()' : toResolve;

		if (['$input', '$()'].includes(name) && hasNoParams(toResolve)) SKIP.add('params');

		let rawKeys = Object.keys(resolved);

		if (name === '$()' || resolved.isMockProxy) {
			rawKeys = Reflect.ownKeys(resolved) as string[];
		}

		if (toResolve === 'Math') {
			rawKeys = Object.keys(Object.getOwnPropertyDescriptors(Math));
		}

		const keys = bringToStart(rawKeys, BOOST)
			.filter((key) => !SKIP.has(key) && isAllowedInDotNotation(key) && !isPseudoParam(key))
			.map((key) => {
				ensureKeyCanBeResolved(resolved, key);

				const isFunction = typeof resolved[key] === 'function';

				const option: Completion = {
					label: isFunction ? key + '()' : key,
					type: isFunction ? 'function' : 'keyword',
				};

				const infoKey = [name, key].join('.');
				const info = i18n.proxyVars[infoKey];

				if (info) option.info = info;

				return option;
			});

		const skipObjectExtensions =
			resolved.isProxy ||
			resolved.json ||
			/json('])?$/.test(toResolve) ||
			toResolve === '$execution' ||
			toResolve.endsWith('params') ||
			resolved.isMockProxy ||
			resolved.__isMockObject;

		if (skipObjectExtensions) return keys;

		return [...keys, ...extensions('object')];
	}

	return [];
}

export const extensions = (typeName: 'number' | 'string' | 'date' | 'array' | 'object') => {
	const extensions = ExpressionExtensions.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!extensions) return [];

	return Object.entries(extensions.functions)
		.filter(([_, fn]) => fn.length === 1) // @TODO: Remove in next phase
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([name, fn]) => {
			const option: Completion = {
				label: name + '()',
				type: 'function',
			};

			option.info = () => {
				// @TODO: Tooltip will be refactored completely in next phase
				const tooltipContainer = document.createElement('div');

				if (!fn.doc?.description) return null;

				tooltipContainer.style.display = 'flex';
				tooltipContainer.style.flexDirection = 'column';
				tooltipContainer.style.paddingTop = 'var(--spacing-4xs)';
				tooltipContainer.style.paddingBottom = 'var(--spacing-4xs)';

				const header = document.createElement('div');
				header.style.marginBottom = 'var(--spacing-2xs)';

				const typeNameSpan = document.createElement('span');
				typeNameSpan.innerHTML = typeName.slice(0, 1).toUpperCase() + typeName.slice(1) + '.';

				const functionNameSpan = document.createElement('span');
				functionNameSpan.innerHTML = fn.doc.name + '()';
				functionNameSpan.style.fontWeight = 'var(--font-weight-bold)';

				const returnTypeSpan = document.createElement('span');
				returnTypeSpan.innerHTML = ': ' + fn.doc.returnType;

				header.appendChild(typeNameSpan);
				header.appendChild(functionNameSpan);
				header.appendChild(returnTypeSpan);

				tooltipContainer.appendChild(header);
				tooltipContainer.appendChild(document.createTextNode(fn.doc.description));

				return tooltipContainer;
			};

			return option;
		});
};

function ensureKeyCanBeResolved(obj: IDataObject, key: string) {
	try {
		obj[key];
	} catch (error) {
		// e.g. attempting to access non-parent node with `$()`
		throw new Error('Cannot generate options', { cause: error });
	}
}
