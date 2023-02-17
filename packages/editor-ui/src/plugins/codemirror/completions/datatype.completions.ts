import { ExpressionExtensions, NativeMethods, IDataObject, DocMetadata } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { i18n } from '@/plugins/i18n';
import { resolveParameter } from '@/mixins/workflowHelpers';
import {
	setRank,
	hasNoParams,
	prefixMatch,
	isAllowedInDotNotation,
	isSplitInBatchesAbsent,
	longestCommonPrefix,
	splitBaseTail,
	isPseudoParam,
	stripExcessParens,
} from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { ExtensionTypeName, FnToDoc, Resolved } from './types';
import { sanitizeHtml } from '@/utils';
import { NativeDoc } from 'n8n-workflow/src/Extensions/Extensions';

type AutocompleteOptionType = 'function' | 'keyword';

/**
 * Resolution-based completions offered according to datatype.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(DATATYPE_REGEX);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const [base, tail] = splitBaseTail(word.text);

	let options: Completion[] = [];

	if (base === 'DateTime') {
		options = luxonStaticOptions().map(stripExcessParens(context));
	} else if (base === 'Object') {
		options = objectGlobalOptions().map(stripExcessParens(context));
	} else {
		let resolved: Resolved;

		try {
			resolved = resolveParameter(`={{ ${base} }}`);
		} catch (_) {
			return null;
		}

		if (resolved === null) return null;

		try {
			options = datatypeOptions(resolved, base).map(stripExcessParens(context));
		} catch (_) {
			return null;
		}
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

	if (typeof resolved === 'number') {
		return [...natives('number'), ...extensions('number')];
	}

	if (typeof resolved === 'string') {
		return [...natives('string'), ...extensions('string')];
	}

	if (['$now', '$today'].includes(toResolve)) {
		return [...luxonInstanceOptions(), ...extensions('date')];
	}

	if (resolved instanceof Date) {
		return [...natives('date'), ...extensions('date')];
	}

	if (Array.isArray(resolved)) {
		if (/all\(.*?\)/.test(toResolve)) return [];

		const arrayMethods = [...natives('array'), ...extensions('array')];

		if (resolved.length > 0 && resolved.some((i) => typeof i !== 'number')) {
			const NUMBER_ONLY_ARRAY_EXTENSIONS = new Set(['max()', 'min()', 'sum()', 'average()']);

			return arrayMethods.filter((m) => !NUMBER_ONLY_ARRAY_EXTENSIONS.has(m.label));
		}

		return arrayMethods;
	}

	if (typeof resolved === 'object') {
		return objectOptions(toResolve, resolved);
	}

	return [];
}

export const natives = (typeName: ExtensionTypeName): Completion[] => {
	const natives: NativeDoc = NativeMethods.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!natives) return [];

	const nativeProps = natives.properties ? toOptions(natives.properties, typeName, 'keyword') : [];
	const nativeMethods = toOptions(natives.functions, typeName, 'function');

	return [...nativeProps, ...nativeMethods];
};

export const extensions = (typeName: ExtensionTypeName) => {
	const extensions = ExpressionExtensions.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!extensions) return [];

	const fnToDoc = Object.entries(extensions.functions).reduce<FnToDoc>((acc, [fnName, fn]) => {
		if (fn.length !== 1) return acc; // @TODO_NEXT_PHASE: Remove to allow extensions which take args

		return { ...acc, [fnName]: { doc: fn.doc } };
	}, {});

	return toOptions(fnToDoc, typeName);
};

export const toOptions = (
	fnToDoc: FnToDoc,
	typeName: ExtensionTypeName,
	optionType: AutocompleteOptionType = 'function',
) => {
	return Object.entries(fnToDoc)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([fnName, fn]) => {
			const option: Completion = {
				label: optionType === 'function' ? fnName + '()' : fnName,
				type: optionType,
			};

			option.info = () => {
				const tooltipContainer = document.createElement('div');
				tooltipContainer.classList.add('autocomplete-info-container');

				if (!fn.doc?.description) return null;

				const header =
					optionType === 'function'
						? createFunctionHeader(typeName, fn)
						: createPropHeader(typeName, fn);
				header.classList.add('autocomplete-info-header');
				tooltipContainer.appendChild(header);

				const descriptionBody = document.createElement('div');
				descriptionBody.classList.add('autocomplete-info-description');
				const descriptionText = document.createElement('p');
				descriptionText.innerHTML = sanitizeHtml(
					fn.doc.description.replace(/`(.*?)`/g, '<code>$1</code>'),
				);
				descriptionBody.appendChild(descriptionText);
				if (fn.doc.docURL) {
					const descriptionLink = document.createElement('a');
					descriptionLink.setAttribute('target', '_blank');
					descriptionLink.setAttribute('href', fn.doc.docURL);
					descriptionLink.innerText = i18n.autocompleteUIValues['docLinkLabel'] || 'Learn more';
					descriptionLink.addEventListener('mousedown', (event: MouseEvent) => {
						// This will prevent documentation popup closing before click
						// event gets to links
						event.preventDefault();
					});
					descriptionLink.classList.add('autocomplete-info-doc-link');
					descriptionBody.appendChild(descriptionLink);
				}
				tooltipContainer.appendChild(descriptionBody);

				return tooltipContainer;
			};

			return option;
		});
};

const createFunctionHeader = (typeName: string, fn: { doc?: DocMetadata | undefined }) => {
	const header = document.createElement('div');
	if (fn.doc) {
		const typeNameSpan = document.createElement('span');
		typeNameSpan.innerHTML = typeName.slice(0, 1).toUpperCase() + typeName.slice(1) + '.';

		const functionNameSpan = document.createElement('span');
		functionNameSpan.classList.add('autocomplete-info-name');
		functionNameSpan.innerHTML = `${fn.doc.name}`;
		let functionArgs = '(';
		if (fn.doc.args) {
			functionArgs += fn.doc.args
				.map((arg) => {
					let argString = `${arg.name}`;
					if (arg.type) {
						argString += `: ${arg.type}`;
					}
					return argString;
				})
				.join(', ');
		}
		functionArgs += ')';
		const argsSpan = document.createElement('span');
		argsSpan.classList.add('autocomplete-info-name-args');
		argsSpan.innerText = functionArgs;

		const returnTypeSpan = document.createElement('span');
		returnTypeSpan.innerHTML = ': ' + fn.doc.returnType;

		header.appendChild(typeNameSpan);
		header.appendChild(functionNameSpan);
		header.appendChild(argsSpan);
		header.appendChild(returnTypeSpan);
	}
	return header;
};

const createPropHeader = (typeName: string, property: { doc?: DocMetadata | undefined }) => {
	const header = document.createElement('div');
	if (property.doc) {
		const typeNameSpan = document.createElement('span');
		typeNameSpan.innerHTML = typeName.slice(0, 1).toUpperCase() + typeName.slice(1) + '.';

		const propNameSpan = document.createElement('span');
		propNameSpan.classList.add('autocomplete-info-name');
		propNameSpan.innerText = property.doc.name;

		const returnTypeSpan = document.createElement('span');
		returnTypeSpan.innerHTML = ': ' + property.doc.returnType;

		header.appendChild(typeNameSpan);
		header.appendChild(propNameSpan);
		header.appendChild(returnTypeSpan);
	}
	return header;
};

const objectOptions = (toResolve: string, resolved: IDataObject) => {
	const rank = setRank(['item', 'all', 'first', 'last']);
	const SKIP = new Set(['__ob__', 'pairedItem']);

	if (isSplitInBatchesAbsent()) SKIP.add('context');

	const name = toResolve.startsWith('$(') ? '$()' : toResolve;

	if (['$input', '$()'].includes(name) && hasNoParams(toResolve)) SKIP.add('params');

	let rawKeys = Object.keys(resolved);

	if (name === '$()') {
		rawKeys = Reflect.ownKeys(resolved) as string[];
	}

	if (toResolve === 'Math') {
		const descriptors = Object.getOwnPropertyDescriptors(Math);
		rawKeys = Object.keys(descriptors).sort((a, b) => a.localeCompare(b));
	}

	const localKeys = rank(rawKeys)
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
		toResolve === 'Math';

	if (skipObjectExtensions) return [...localKeys, ...natives('object')];

	return [...localKeys, ...natives('object'), ...extensions('object')];
};

function ensureKeyCanBeResolved(obj: IDataObject, key: string) {
	try {
		obj[key];
	} catch (error) {
		// e.g. attempt to access disconnected node with `$()`
		throw new Error('Cannot generate options', { cause: error });
	}
}

/**
 * Methods and fields defined on a Luxon `DateTime` class instance.
 */
export const luxonInstanceOptions = () => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	return Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				type: isFunction ? 'function' : 'keyword',
			};

			const info = i18n.luxonInstance[key];

			if (info) option.info = info;

			return option;
		});
};

/**
 * Methods defined on a Luxon `DateTime` class.
 */
export const luxonStaticOptions = () => {
	const SKIP = new Set(['prototype', 'name', 'length', 'invalid']);

	return Object.keys(Object.getOwnPropertyDescriptors(DateTime))
		.filter((key) => !SKIP.has(key) && !key.includes('_'))
		.sort((a, b) => a.localeCompare(b))
		.map((key) => {
			const option: Completion = {
				label: key + '()',
				type: 'function',
			};

			const info = i18n.luxonStatic[key];

			if (info) option.info = info;

			return option;
		});
};

/**
 * Methods defined on the global `Object`.
 */
export const objectGlobalOptions = () => {
	return ['assign', 'entries', 'keys', 'values'].map((key) => {
		const option: Completion = {
			label: key + '()',
			type: 'function',
		};

		const info = i18n.globalObject[key];

		if (info) option.info = info;

		return option;
	});
};

const regexes = {
	generalRef: /\$[^$]+\.([^{\s])*/, // $input. or $json. or similar ones
	selectorRef: /\$\(['"][\S\s]+['"]\)\.([^{\s])*/, // $('nodeName').

	numberLiteral: /\((\d+)\.?(\d*)\)\.([^{\s])*/, // (123). or (123.4).
	stringLiteral: /(".+"|('.+'))\.([^{\s])*/, // 'abc'. or "abc".
	dateLiteral: /\(?new Date\(\(?.*?\)\)?\.([^{\s])*/, // new Date(). or (new Date()).
	arrayLiteral: /(\[.+\])\.([^{\s])*/, // [1, 2, 3].
	objectLiteral: /\(\{.*\}\)\.([^{\s])*/, // ({}).

	mathGlobal: /Math\.([^{\s])*/, // Math.
	datetimeGlobal: /DateTime\.[^.}]*/, // DateTime.
	objectGlobal: /Object\.(\w+\(.*\)\.[^{\s]*)?/, // Object. or Object.method(arg).
};

const DATATYPE_REGEX = new RegExp(
	Object.values(regexes)
		.map((regex) => regex.source)
		.join('|'),
);
