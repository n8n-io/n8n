import type { IDataObject, DocMetadata, NativeDoc } from 'n8n-workflow';
import { Expression, ExpressionExtensions, NativeMethods, validateFieldType } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { i18n } from '@/plugins/i18n';
import { resolveParameter } from '@/composables/useWorkflowHelpers';
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
	isCredentialsModalOpen,
	applyCompletion,
	sortCompletionsAlpha,
	hasRequiredArgs,
} from './utils';
import type {
	Completion,
	CompletionContext,
	CompletionResult,
	CompletionSection,
} from '@codemirror/autocomplete';
import type {
	AutocompleteInput,
	AutocompleteOptionType,
	ExtensionTypeName,
	FnToDoc,
	Resolved,
} from './types';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { isFunctionOption } from './typeGuards';
import { luxonInstanceDocs } from './nativesAutocompleteDocs/luxon.instance.docs';
import { luxonStaticDocs } from './nativesAutocompleteDocs/luxon.static.docs';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import {
	ARRAY_NUMBER_ONLY_METHODS,
	ARRAY_RECOMMENDED_OPTIONS,
	DATE_RECOMMENDED_OPTIONS,
	FIELDS_SECTION,
	LUXON_RECOMMENDED_OPTIONS,
	LUXON_SECTIONS,
	METHODS_SECTION,
	OBJECT_RECOMMENDED_OPTIONS,
	OTHER_METHODS_SECTION,
	OTHER_SECTION,
	PROPERTIES_SECTION,
	RECOMMENDED_METHODS_SECTION,
	RECOMMENDED_SECTION,
	STRING_RECOMMENDED_OPTIONS,
	STRING_SECTIONS,
} from './constants';
import { VALID_EMAIL_REGEX } from '@/constants';
import { uniqBy } from 'lodash-es';

/**
 * Resolution-based completions offered according to datatype.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(DATATYPE_REGEX);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	// eslint-disable-next-line prefer-const
	let [base, tail] = splitBaseTail(word.text);

	let options: Completion[] = [];

	const isCredential = isCredentialsModalOpen();

	if (base === 'DateTime') {
		options = luxonStaticOptions().map(stripExcessParens(context));
	} else if (base === 'Object') {
		options = objectGlobalOptions().map(stripExcessParens(context));
	} else if (base === '$vars') {
		options = variablesOptions();
	} else if (/\$secrets\./.test(base) && isCredential) {
		options = secretOptions(base).map(stripExcessParens(context));
	} else if (base === '$secrets' && isCredential) {
		options = secretProvidersOptions();
	} else {
		let resolved: Resolved;

		try {
			resolved = resolveParameter(`={{ ${base} }}`);
		} catch {
			return null;
		}

		if (resolved === null) return null;

		try {
			options = datatypeOptions({ resolved, base, tail }).map(stripExcessParens(context));
		} catch {
			return null;
		}
	}

	if (options.length === 0) return null;

	if (tail !== '') {
		options = options.filter((o) => prefixMatch(o.label, tail) && o.label !== tail);
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

function datatypeOptions(input: AutocompleteInput): Completion[] {
	const { resolved } = input;

	if (resolved === null) return [];

	if (typeof resolved === 'number') {
		return numberOptions(input as AutocompleteInput<number>);
	}

	if (typeof resolved === 'string') {
		return stringOptions(input as AutocompleteInput<string>);
	}

	if (resolved instanceof DateTime) {
		return luxonOptions();
	}

	if (resolved instanceof Date) {
		return dateOptions();
	}

	if (Array.isArray(resolved)) {
		return arrayOptions(input as AutocompleteInput<unknown[]>);
	}

	if (typeof resolved === 'object') {
		return objectOptions(input as AutocompleteInput<IDataObject>);
	}

	return [];
}

export const natives = (typeName: ExtensionTypeName): Completion[] => {
	const natives: NativeDoc = NativeMethods.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!natives) return [];

	const nativeProps = natives.properties ? toOptions(natives.properties, typeName, 'keyword') : [];
	const nativeMethods = toOptions(natives.functions, typeName, 'native-function');

	return [...nativeProps, ...nativeMethods];
};

export const extensions = (typeName: ExtensionTypeName, includeHidden = false) => {
	const extensions = ExpressionExtensions.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!extensions) return [];

	const fnToDoc = Object.entries(extensions.functions).reduce<FnToDoc>((acc, [fnName, fn]) => {
		return { ...acc, [fnName]: { doc: fn.doc } };
	}, {});

	return toOptions(fnToDoc, typeName, 'extension-function', includeHidden);
};

export const toOptions = (
	fnToDoc: FnToDoc,
	typeName: ExtensionTypeName,
	optionType: AutocompleteOptionType = 'native-function',
	includeHidden = false,
) => {
	return Object.entries(fnToDoc)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([, docInfo]) => !docInfo.doc?.hidden || includeHidden)
		.map(([fnName, docInfo]) => {
			return createCompletionOption(typeName, fnName, optionType, docInfo);
		});
};

const createCompletionOption = (
	typeName: string,
	name: string,
	optionType: AutocompleteOptionType,
	docInfo: { doc?: DocMetadata | undefined },
): Completion => {
	const isFunction = isFunctionOption(optionType);
	const label = isFunction ? name + '()' : name;
	const option: Completion = {
		label,
		type: optionType,
		section: docInfo.doc?.section,
		apply: applyCompletion(hasRequiredArgs(docInfo?.doc)),
	};

	option.info = () => {
		const tooltipContainer = document.createElement('div');
		tooltipContainer.classList.add('autocomplete-info-container');

		if (!docInfo.doc) return null;

		const header = isFunctionOption(optionType)
			? createFunctionHeader(typeName, docInfo)
			: createPropHeader(typeName, docInfo);
		header.classList.add('autocomplete-info-header');
		tooltipContainer.appendChild(header);

		if (docInfo.doc.description) {
			const descriptionBody = document.createElement('div');
			descriptionBody.classList.add('autocomplete-info-description');
			const descriptionText = document.createElement('p');
			descriptionText.innerHTML = sanitizeHtml(
				docInfo.doc.description.replace(/`(.*?)`/g, '<code>$1</code>'),
			);
			descriptionBody.appendChild(descriptionText);
			if (docInfo.doc.docURL) {
				const descriptionLink = document.createElement('a');
				descriptionLink.setAttribute('target', '_blank');
				descriptionLink.setAttribute('href', docInfo.doc.docURL);
				descriptionLink.innerText = i18n.autocompleteUIValues.docLinkLabel || 'Learn more';
				descriptionLink.addEventListener('mousedown', (event: MouseEvent) => {
					// This will prevent documentation popup closing before click
					// event gets to links
					event.preventDefault();
				});
				descriptionLink.classList.add('autocomplete-info-doc-link');
				descriptionBody.appendChild(descriptionLink);
			}
			tooltipContainer.appendChild(descriptionBody);
		}

		return tooltipContainer;
	};

	return option;
};

const createFunctionHeader = (typeName: string, fn: { doc?: DocMetadata | undefined }) => {
	const header = document.createElement('div');
	if (fn.doc) {
		const typeNameSpan = document.createElement('span');
		typeNameSpan.innerHTML = typeName.slice(0, 1).toUpperCase() + typeName.slice(1) + '.';
		header.appendChild(typeNameSpan);

		const functionNameSpan = document.createElement('span');
		functionNameSpan.classList.add('autocomplete-info-name');
		functionNameSpan.innerHTML = `${fn.doc.name}`;
		header.appendChild(functionNameSpan);
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
		header.appendChild(argsSpan);
		if (fn.doc.returnType) {
			const returnTypeSpan = document.createElement('span');
			returnTypeSpan.innerHTML = ': ' + fn.doc.returnType;
			header.appendChild(returnTypeSpan);
		}
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

const objectOptions = (input: AutocompleteInput<IDataObject>): Completion[] => {
	const { base, resolved } = input;
	const rank = setRank(['item', 'all', 'first', 'last']);
	const SKIP = new Set(['__ob__', 'pairedItem']);

	if (isSplitInBatchesAbsent()) SKIP.add('context');

	const name = /^\$\(.*\)$/.test(base) ? '$()' : base;

	if (['$input', '$()'].includes(name) && hasNoParams(base)) SKIP.add('params');

	let rawKeys = Object.keys(resolved);

	if (name === '$()') {
		rawKeys = Reflect.ownKeys(resolved) as string[];
	}

	if (base === 'Math') {
		const descriptors = Object.getOwnPropertyDescriptors(Math);
		rawKeys = Object.keys(descriptors).sort((a, b) => a.localeCompare(b));
	}

	const localKeys = rank(rawKeys)
		.filter((key) => !SKIP.has(key) && isAllowedInDotNotation(key) && !isPseudoParam(key))
		.map((key) => {
			ensureKeyCanBeResolved(resolved, key);
			const resolvedProp = resolved[key];

			const isFunction = typeof resolvedProp === 'function';
			const hasArgs = isFunction && resolvedProp.length > 0 && name !== '$()';

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				type: isFunction ? 'function' : 'keyword',
				section: getObjectPropertySection({ name, key, isFunction }),
				apply: applyCompletion(hasArgs),
			};

			const infoKey = [name, key].join('.');
			option.info = createCompletionOption('', key, isFunction ? 'native-function' : 'keyword', {
				doc: {
					name: key,
					returnType: typeof resolvedProp,
					description: i18n.proxyVars[infoKey],
				},
			}).info;

			return option;
		});

	const skipObjectExtensions =
		resolved.isProxy ||
		resolved.json ||
		/json('])$/.test(base) ||
		base === '$execution' ||
		base.endsWith('params') ||
		base === 'Math';

	if (skipObjectExtensions) {
		return sortCompletionsAlpha([...localKeys, ...natives('object')]);
	}

	return applySections({
		options: sortCompletionsAlpha([...localKeys, ...natives('object'), ...extensions('object')]),
		recommended: OBJECT_RECOMMENDED_OPTIONS,
		recommendedSection: RECOMMENDED_METHODS_SECTION,
		methodsSection: OTHER_METHODS_SECTION,
		propSection: FIELDS_SECTION,
		excludeRecommended: true,
	});
};

const getObjectPropertySection = ({
	name,
	key,
	isFunction,
}: {
	name: string;
	key: string;
	isFunction: boolean;
}): CompletionSection => {
	if (name === '$input' || name === '$()') {
		if (key === 'item') return RECOMMENDED_SECTION;
		return OTHER_SECTION;
	}

	return isFunction ? METHODS_SECTION : FIELDS_SECTION;
};

const applySections = ({
	options,
	sections,
	recommended = [],
	excludeRecommended = false,
	methodsSection = METHODS_SECTION,
	propSection = PROPERTIES_SECTION,
	recommendedSection = RECOMMENDED_SECTION,
}: {
	options: Completion[];
	recommended?: string[];
	recommendedSection?: CompletionSection;
	methodsSection?: CompletionSection;
	propSection?: CompletionSection;
	sections?: Record<string, CompletionSection>;
	excludeRecommended?: boolean;
}) => {
	const recommendedSet = new Set(recommended);
	const optionByLabel = options.reduce(
		(acc, option) => {
			acc[option.label] = option;
			return acc;
		},
		{} as Record<string, Completion>,
	);
	return recommended
		.map(
			(reco): Completion => ({
				...optionByLabel[reco],
				section: recommendedSection,
			}),
		)
		.concat(
			options
				.filter((option) => !excludeRecommended || !recommendedSet.has(option.label))
				.map((option) => {
					if (sections) {
						option.section = sections[option.section as string] ?? OTHER_SECTION;
					} else {
						option.section = option.label.endsWith('()') ? methodsSection : propSection;
					}
					return option;
				}),
		);
};

const isUrl = (url: string): boolean => {
	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
};

const stringOptions = (input: AutocompleteInput<string>): Completion[] => {
	const { resolved, tail } = input;
	const options = sortCompletionsAlpha([...natives('string'), ...extensions('string')]);

	if (validateFieldType('string', resolved, 'number').valid) {
		return applySections({
			options,
			recommended: ['toInt()', 'toFloat()'],
			sections: STRING_SECTIONS,
		});
	}

	if (validateFieldType('string', resolved, 'dateTime').valid) {
		return applySections({
			options,
			recommended: ['toDate()'],
			sections: STRING_SECTIONS,
		});
	}

	if (VALID_EMAIL_REGEX.test(resolved) || isUrl(resolved)) {
		return applySections({
			options,
			recommended: ['extractDomain()', 'isEmail()', ...STRING_RECOMMENDED_OPTIONS],
			sections: STRING_SECTIONS,
		});
	}

	if (resolved.split(/\s/).find((token) => VALID_EMAIL_REGEX.test(token))) {
		return applySections({
			options,
			recommended: ['extractEmail()', ...STRING_RECOMMENDED_OPTIONS],
			sections: STRING_SECTIONS,
		});
	}

	return applySections({
		options,
		recommended: STRING_RECOMMENDED_OPTIONS,
		sections: STRING_SECTIONS,
	});
};

const numberOptions = (input: AutocompleteInput<number>): Completion[] => {
	const { resolved } = input;
	const options = sortCompletionsAlpha([...natives('number'), ...extensions('number')]);
	const ONLY_INTEGER = ['isEven()', 'isOdd()'];

	if (Number.isInteger(resolved)) {
		return applySections({
			options,
			recommended: ONLY_INTEGER,
		});
	} else {
		const exclude = new Set(ONLY_INTEGER);
		return applySections({
			options: options.filter((option) => !exclude.has(option.label)),
			recommended: ['round()', 'floor()', 'ceil()', 'toFixed()'],
		});
	}
};

const dateOptions = (): Completion[] => {
	return applySections({
		options: sortCompletionsAlpha([...natives('date'), ...extensions('date', true)]),
		recommended: DATE_RECOMMENDED_OPTIONS,
	});
};

const luxonOptions = (): Completion[] => {
	return applySections({
		options: sortCompletionsAlpha(
			uniqBy([...extensions('date'), ...luxonInstanceOptions()], (option) => option.label),
		),
		recommended: LUXON_RECOMMENDED_OPTIONS,
		sections: LUXON_SECTIONS,
	});
};

const arrayOptions = (input: AutocompleteInput<unknown[]>): Completion[] => {
	const { resolved } = input;
	const options = applySections({
		options: sortCompletionsAlpha([...natives('array'), ...extensions('array')]),
		recommended: ARRAY_RECOMMENDED_OPTIONS,
		methodsSection: OTHER_SECTION,
		propSection: OTHER_SECTION,
		excludeRecommended: true,
	});

	if (resolved.length > 0 && resolved.some((i) => typeof i !== 'number')) {
		const NUMBER_ONLY_ARRAY_EXTENSIONS = new Set(ARRAY_NUMBER_ONLY_METHODS);

		return options.filter((m) => !NUMBER_ONLY_ARRAY_EXTENSIONS.has(m.label));
	}
	return options;
};

function ensureKeyCanBeResolved(obj: IDataObject, key: string) {
	try {
		obj[key];
	} catch (error) {
		// e.g. attempt to access disconnected node with `$()`
		throw new Error('Cannot generate options', { cause: error });
	}
}

export const variablesOptions = () => {
	const environmentsStore = useEnvironmentsStore();
	const variables = environmentsStore.variables;

	return variables.map((variable) =>
		createCompletionOption('Object', variable.key, 'keyword', {
			doc: {
				name: variable.key,
				returnType: 'string',
				description: i18n.baseText('codeNodeEditor.completer.$vars.varName'),
				docURL: 'https://docs.n8n.io/environments/variables/',
			},
		}),
	);
};

export const secretOptions = (base: string) => {
	const externalSecretsStore = useExternalSecretsStore();
	let resolved: Resolved;

	try {
		resolved = Expression.resolveWithoutWorkflow(`{{ ${base} }}`, {
			$secrets: externalSecretsStore.secretsAsObject,
		});
	} catch {
		return [];
	}

	if (resolved === null) return [];

	try {
		if (typeof resolved !== 'object') {
			return [];
		}
		return Object.entries(resolved).map(([secret, value]) =>
			createCompletionOption('Object', secret, 'keyword', {
				doc: {
					name: secret,
					returnType: typeof value,
					description: i18n.baseText('codeNodeEditor.completer.$secrets.provider.varName'),
					docURL: i18n.baseText('settings.externalSecrets.docs'),
				},
			}),
		);
	} catch {
		return [];
	}
};

export const secretProvidersOptions = () => {
	const externalSecretsStore = useExternalSecretsStore();

	return Object.keys(externalSecretsStore.secretsAsObject).map((provider) =>
		createCompletionOption('Object', provider, 'keyword', {
			doc: {
				name: provider,
				returnType: 'object',
				description: i18n.baseText('codeNodeEditor.completer.$secrets.provider'),
				docURL: i18n.baseText('settings.externalSecrets.docs'),
			},
		}),
	);
};

/**
 * Methods and fields defined on a Luxon `DateTime` class instance.
 */
export const luxonInstanceOptions = (includeHidden = false) => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	return Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';
			const optionType = isFunction ? 'native-function' : 'keyword';
			return createLuxonAutocompleteOption(
				key,
				optionType,
				luxonInstanceDocs,
				i18n.luxonInstance,
				includeHidden,
			) as Completion;
		})
		.filter(Boolean);
};

/**
 * Methods defined on a Luxon `DateTime` class.
 */
export const luxonStaticOptions = () => {
	const SKIP = new Set(['prototype', 'name', 'length', 'invalid']);

	return sortCompletionsAlpha(
		Object.keys(Object.getOwnPropertyDescriptors(DateTime))
			.filter((key) => !SKIP.has(key) && !key.includes('_'))
			.map((key) => {
				return createLuxonAutocompleteOption(
					key,
					'native-function',
					luxonStaticDocs,
					i18n.luxonStatic,
				) as Completion;
			})
			.filter(Boolean),
	);
};

const createLuxonAutocompleteOption = (
	name: string,
	type: AutocompleteOptionType,
	docDefinition: NativeDoc,
	translations: Record<string, string | undefined>,
	includeHidden = false,
): Completion | null => {
	const isFunction = isFunctionOption(type);
	const label = isFunction ? name + '()' : name;

	let doc: DocMetadata | undefined;
	if (docDefinition.properties && docDefinition.properties.hasOwnProperty(name)) {
		doc = docDefinition.properties[name].doc;
	} else if (docDefinition.functions.hasOwnProperty(name)) {
		doc = docDefinition.functions[name].doc;
	} else {
		// Use inferred/default values if docs are still not updated
		// This should happen when our doc specification becomes
		// out-od-date with Luxon implementation
		const optionType = typeof DateTime.prototype[name as keyof DateTime];
		doc = {
			name,
			returnType: !optionType || optionType === 'undefined' ? '' : optionType,
			docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
		};
	}

	if (doc?.hidden && !includeHidden) {
		return null;
	}

	const option: Completion = {
		label,
		type,
		section: doc?.section,
		apply: applyCompletion(hasRequiredArgs(doc)),
	};
	option.info = createCompletionOption('DateTime', name, type, {
		// Add translated description
		doc: { ...doc, description: translations[name] } as DocMetadata,
	}).info;
	return option;
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
	generalRef: /\$[^$'"]+\.(.*)/, // $input. or $json. or similar ones
	selectorRef: /\$\(['"][\S\s]+['"]\)\.(.*)/, // $('nodeName').

	numberLiteral: /\((\d+)\.?(\d*)\)\.(.*)/, // (123). or (123.4).
	singleQuoteStringLiteral: /('.+')\.([^'{\s])*/, // 'abc'.
	doubleQuoteStringLiteral: /(".+")\.([^"{\s])*/, // "abc".
	dateLiteral: /\(?new Date\(\(?.*?\)\)?\.(.*)/, // new Date(). or (new Date()).
	arrayLiteral: /(\[.*\])\.(.*)/, // [1, 2, 3].
	indexedAccess: /([^"{\s]+\[.+\])\.(.*)/, // 'abc'[0]. or 'abc'.split('')[0] or similar ones
	objectLiteral: /\(\{.*\}\)\.(.*)/, // ({}).

	mathGlobal: /Math\.(.*)/, // Math.
	datetimeGlobal: /DateTime\.(.*)/, // DateTime.
	objectGlobal: /Object\.(.*)/, // Object. or Object.method(arg).
};

const DATATYPE_REGEX = new RegExp(
	Object.values(regexes)
		.map((regex) => regex.source)
		.join('|'),
);
