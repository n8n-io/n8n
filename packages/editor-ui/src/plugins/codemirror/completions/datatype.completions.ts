import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { VALID_EMAIL_REGEX } from '@/constants';
import { i18n } from '@/plugins/i18n';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { sanitizeHtml } from '@/utils/htmlUtils';
import type {
	Completion,
	CompletionContext,
	CompletionResult,
	CompletionSection,
} from '@codemirror/autocomplete';
import { uniqBy } from 'lodash-es';
import { DateTime } from 'luxon';
import type { DocMetadata, IDataObject, NativeDoc } from 'n8n-workflow';
import { Expression, ExpressionExtensions, NativeMethods, validateFieldType } from 'n8n-workflow';
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
import { luxonInstanceDocs } from './nativesAutocompleteDocs/luxon.instance.docs';
import { luxonStaticDocs } from './nativesAutocompleteDocs/luxon.static.docs';
import type { AutocompleteInput, ExtensionTypeName, FnToDoc, Resolved } from './types';
import {
	applyCompletion,
	getDefaultArgs,
	hasNoParams,
	hasRequiredArgs,
	insertDefaultArgs,
	isAllowedInDotNotation,
	isCredentialsModalOpen,
	isPseudoParam,
	isSplitInBatchesAbsent,
	longestCommonPrefix,
	prefixMatch,
	setRank,
	sortCompletionsAlpha,
	splitBaseTail,
	stripExcessParens,
} from './utils';

/**
 * Resolution-based completions offered according to datatype.
 */
export function datatypeCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(DATATYPE_REGEX);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	const [base, tail] = splitBaseTail(word.text);

	let options: Completion[] = [];

	const isCredential = isCredentialsModalOpen();

	if (base === 'DateTime') {
		options = luxonStaticOptions(base).map(stripExcessParens(context));
	} else if (base === 'Object') {
		options = objectGlobalOptions().map(stripExcessParens(context));
	} else if (base === '$vars') {
		options = variablesOptions(base);
	} else if (/\$secrets\./.test(base) && isCredential) {
		options = secretOptions(base).map(stripExcessParens(context));
	} else if (base === '$secrets' && isCredential) {
		options = secretProvidersOptions(base);
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

	if (tail !== '') {
		options = options.filter((o) => prefixMatch(o.label, tail) && o.label !== tail);
	}

	let from = word.to - tail.length;

	// When autocomplete is explicitely opened (by Ctrl+Space or programatically), add completions for the current word with '.' prefix
	// example: {{ $json.str| }} -> ['length', 'includes()'...] (would usually need a '.' suffix)
	if (context.explicit && !word.text.endsWith('.') && options.length === 0) {
		options = explicitDataTypeOptions(word.text);
		from = word.to;
	}

	if (options.length === 0) return null;

	return {
		from,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(tail, completion.label);

			return [0, lcp.length];
		},
	};
}

function explicitDataTypeOptions(expression: string): Completion[] {
	try {
		const resolved = resolveParameter(`={{ ${expression} }}`);
		return datatypeOptions({
			resolved,
			base: expression,
			tail: '',
			transformLabel: (label) => '.' + label,
		});
	} catch {
		return [];
	}
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

	if (typeof resolved === 'boolean') {
		return booleanOptions(input as AutocompleteInput<boolean>);
	}

	if (resolved instanceof DateTime) {
		return luxonOptions(input as AutocompleteInput<DateTime>);
	}

	if (resolved instanceof Date) {
		return dateOptions(input as AutocompleteInput<Date>);
	}

	if (Array.isArray(resolved)) {
		return arrayOptions(input as AutocompleteInput<unknown[]>);
	}

	if (typeof resolved === 'object') {
		return objectOptions(input as AutocompleteInput<IDataObject>);
	}

	return [];
}

export const natives = ({
	typeName,
	base,
	transformLabel = (label) => label,
}: {
	typeName: ExtensionTypeName;
	base: string;
	transformLabel?: (label: string) => string;
}): Completion[] => {
	const nativeDocs: NativeDoc = NativeMethods.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!nativeDocs) return [];

	const nativeProps = nativeDocs.properties
		? toOptions({
				fnToDoc: nativeDocs.properties,
				base,
				includeHidden: false,
				isFunction: false,
				transformLabel,
			})
		: [];

	const nativeMethods = toOptions({
		fnToDoc: nativeDocs.functions,
		base,
		includeHidden: false,
		isFunction: true,
		transformLabel,
	});

	return [...nativeProps, ...nativeMethods];
};

export const extensions = ({
	typeName,
	base,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	typeName: ExtensionTypeName;
	base: string;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}) => {
	const expressionExtensions: Extension = ExpressionExtensions.find(
		(ee) => ee.typeName.toLowerCase() === typeName,
	);

	if (!expressionExtensions) return [];

	const fnToDoc = Object.entries(expressionExtensions.functions).reduce<FnToDoc>(
		(acc, [fnName, fn]) => {
			return { ...acc, [fnName]: { doc: fn.doc } };
		},
		{},
	);

	return toOptions({ fnToDoc, base, isFunction: true, includeHidden, transformLabel });
};

export const getType = (value: unknown): string => {
	if (Array.isArray(value)) return 'array';
	if (value === null) return 'null';
	return (typeof value).toLocaleLowerCase();
};

export const isInputData = (base: string): boolean => {
	return (
		/^\$input\..*\.json]/.test(base) || /^\$json/.test(base) || /^\$\(.*\)\..*\.json/.test(base)
	);
};

export const getDetail = (base: string, value: unknown): string | undefined => {
	const type = getType(value);
	if (!isInputData(base) || type === 'function') return undefined;
	return type;
};

export const toOptions = ({
	fnToDoc,
	base,
	isFunction = false,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	fnToDoc: FnToDoc;
	base: string;
	isFunction?: boolean;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}) => {
	return Object.entries(fnToDoc)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([, docInfo]) => Boolean(docInfo.doc && !docInfo.doc?.hidden) || includeHidden)
		.map(([fnName, docInfo]) => {
			return createCompletionOption({
				base,
				name: fnName,
				doc: docInfo.doc,
				isFunction,
				transformLabel,
			});
		});
};

const createCompletionOption = ({
	base,
	name,
	doc,
	isFunction = false,
	transformLabel = (label) => label,
}: {
	base: string;
	name: string;
	doc?: DocMetadata;
	isFunction?: boolean;
	transformLabel?: (label: string) => string;
}): Completion => {
	const label = isFunction ? name + '()' : name;
	const option: Completion = {
		label,
		section: doc?.section,
		apply: applyCompletion({
			hasArgs: hasRequiredArgs(doc),
			defaultArgs: getDefaultArgs(doc),
			transformLabel,
		}),
	};
	option.info = () => {
		const tooltipContainer = document.createElement('div');
		tooltipContainer.classList.add('autocomplete-info-container');
		const mainContent = document.createElement('div');
		mainContent.classList.add('autocomplete-info-main');
		tooltipContainer.appendChild(mainContent);

		if (!doc) return null;

		const { examples, args } = doc;

		const header = isFunction ? createFunctionHeader(base, doc) : createPropHeader(base, doc);
		header.classList.add('autocomplete-info-header');
		mainContent.appendChild(header);

		if (doc.description) {
			const descriptionBody = document.createElement('div');
			descriptionBody.classList.add('autocomplete-info-description');
			const descriptionText = document.createElement('p');
			descriptionText.innerHTML = sanitizeHtml(
				doc.description.replace(/`(.*?)`/g, '<code>$1</code>'),
			);
			descriptionBody.appendChild(descriptionText);

			if (doc.docURL) {
				const descriptionLink = document.createElement('a');
				descriptionLink.setAttribute('target', '_blank');
				descriptionLink.setAttribute('href', doc.docURL);
				descriptionLink.innerText =
					i18n.autocompleteUIValues.docLinkLabel ?? i18n.baseText('generic.learnMore');
				descriptionLink.addEventListener('mousedown', (event: MouseEvent) => {
					// This will prevent documentation popup closing before click
					// event gets to links
					event.preventDefault();
				});
				descriptionLink.classList.add('autocomplete-info-doc-link');
				descriptionText.appendChild(descriptionLink);
			}
			mainContent.appendChild(descriptionBody);
		}

		if (args && args.length > 0) {
			const argsList = document.createElement('ul');
			argsList.classList.add('autocomplete-info-args');

			for (const arg of args) {
				const argItem = document.createElement('li');
				const argName = document.createElement('span');
				argName.classList.add('autocomplete-info-arg-name');
				argName.textContent = arg.name;
				argItem.appendChild(argName);

				if (arg.type) {
					const argType = document.createElement('span');
					argType.classList.add('autocomplete-info-arg-type');
					argType.textContent = `: ${arg.type}`;
					argItem.appendChild(argType);
				}

				if (arg.description) {
					const argDescription = document.createElement('span');
					argDescription.classList.add('autocomplete-info-arg-description');
					argDescription.innerHTML = `- ${sanitizeHtml(
						arg.description.replace(/`(.*?)`/g, '<code>$1</code>'),
					)}`;

					argItem.appendChild(argDescription);
				}

				argsList.appendChild(argItem);
			}

			mainContent.appendChild(argsList);
		}

		if (examples && examples.length > 0) {
			const examplesWrapper = document.createElement('div');
			examplesWrapper.classList.add('autocomplete-info-examples-wrapper');

			const examplesContainer = document.createElement('div');
			examplesContainer.classList.add('autocomplete-info-examples');

			const examplesTitle = document.createElement('div');
			examplesTitle.classList.add('autocomplete-info-examples-title');
			examplesTitle.textContent = i18n.baseText('codeNodeEditor.examples');
			examplesContainer.appendChild(examplesTitle);

			const examplePre = document.createElement('pre');
			const exampleCode = document.createElement('code');
			examplePre.appendChild(exampleCode);
			examplesContainer.appendChild(examplePre);
			examplesWrapper.appendChild(examplesContainer);

			examples.forEach((example, index) => {
				if (example.description) {
					const exampleComment = document.createElement('span');
					exampleComment.classList.add('autocomplete-info-example-comment');
					exampleComment.textContent = `// ${example.description}\n`;
					exampleCode.appendChild(exampleComment);
				}

				const exampleExpression = document.createElement('span');
				exampleExpression.classList.add('autocomplete-info-example-expr');
				exampleExpression.textContent = `${JSON.stringify(example.subject)}.${doc.name}(${example.args.map((arg) => JSON.stringify(arg)).join(', ')})\n`;
				exampleCode.appendChild(exampleExpression);

				if (example.evaluated !== undefined) {
					const exampleEvaluated = document.createElement('span');
					exampleEvaluated.textContent = `// => ${example.evaluated}\n`;
					exampleCode.appendChild(exampleEvaluated);
				}

				if (index !== examples.length - 1) {
					exampleCode.textContent += '\n';
				}
			});

			tooltipContainer.appendChild(examplesWrapper);
		}

		return tooltipContainer;
	};

	return option;
};

const createFunctionHeader = (base: string, doc?: DocMetadata) => {
	const header = document.createElement('div');
	if (doc) {
		const shortBase = base.split('.').pop() ?? base;
		const baseSpan = document.createElement('span');
		baseSpan.textContent = shortBase + '.';
		header.appendChild(baseSpan);

		const functionNameSpan = document.createElement('span');
		functionNameSpan.classList.add('autocomplete-info-name');
		functionNameSpan.textContent = doc.name;
		header.appendChild(functionNameSpan);

		const openBracketsSpan = document.createElement('span');
		openBracketsSpan.textContent = '(';
		header.appendChild(openBracketsSpan);

		const argsSpan = document.createElement('span');
		doc.args?.forEach((arg, index, array) => {
			const argSpan = document.createElement('span');
			argSpan.textContent = arg.name;
			argSpan.classList.add('autocomplete-info-arg');
			argsSpan.appendChild(argSpan);

			if (index !== array.length - 1) {
				const separatorSpan = document.createElement('span');
				separatorSpan.textContent = ', ';
				argsSpan.appendChild(separatorSpan);
			}
		});
		header.appendChild(argsSpan);

		const closeBracketsSpan = document.createElement('span');
		closeBracketsSpan.textContent = ')';
		header.appendChild(closeBracketsSpan);
	}
	return header;
};

const createPropHeader = (typeName: string, doc?: DocMetadata) => {
	const header = document.createElement('div');
	if (doc) {
		const typeNameSpan = document.createElement('span');
		typeNameSpan.innerHTML = typeName.slice(0, 1).toUpperCase() + typeName.slice(1) + '.';

		const propNameSpan = document.createElement('span');
		propNameSpan.classList.add('autocomplete-info-name');
		propNameSpan.innerText = doc.name;

		const returnTypeSpan = document.createElement('span');
		returnTypeSpan.innerHTML = ': ' + doc.returnType;

		header.appendChild(typeNameSpan);
		header.appendChild(propNameSpan);
		header.appendChild(returnTypeSpan);
	}
	return header;
};

const objectOptions = (input: AutocompleteInput<IDataObject>): Completion[] => {
	const { base, resolved, transformLabel } = input;
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
				apply: applyCompletion({ hasArgs, transformLabel }),
				detail: getDetail(name, resolvedProp),
			};

			const infoKey = [name, key].join('.');
			option.info = createCompletionOption({
				name: key,
				base,
				doc: {
					name: key,
					returnType: getType(resolvedProp),
					description: i18n.proxyVars[infoKey],
				},
				transformLabel,
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
		return sortCompletionsAlpha([...localKeys, ...natives({ base, typeName: 'object' })]);
	}

	return applySections({
		options: sortCompletionsAlpha([
			...localKeys,
			...natives({ base, typeName: 'object' }),
			...extensions({ base, typeName: 'object' }),
		]),
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
	recommended?: Array<string | { label: string; args: unknown[] }>;
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
		.map((reco): Completion => {
			const option = optionByLabel[typeof reco === 'string' ? reco : reco.label];
			const label =
				typeof reco === 'string' ? option.label : insertDefaultArgs(reco.label, reco.args);
			return { ...option, label, section: recommendedSection };
		})
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
	const { base, resolved, transformLabel } = input;
	const options = sortCompletionsAlpha([
		...natives({ typeName: 'string', base, transformLabel }),
		...extensions({ typeName: 'string', base, includeHidden: false, transformLabel }),
	]);

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
			recommended: ['toDateTime()'],
			sections: STRING_SECTIONS,
		});
	}

	if (VALID_EMAIL_REGEX.test(resolved)) {
		return applySections({
			options,
			recommended: ['extractDomain()', 'isEmail()', ...STRING_RECOMMENDED_OPTIONS],
			sections: STRING_SECTIONS,
		});
	}

	if (isUrl(resolved)) {
		return applySections({
			options,
			recommended: ['extractDomain()', 'extractUrlPath()', ...STRING_RECOMMENDED_OPTIONS],
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

	const trimmed = resolved.trim();
	if (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	) {
		return applySections({
			options,
			recommended: ['parseJson()', ...STRING_RECOMMENDED_OPTIONS],
			sections: STRING_SECTIONS,
		});
	}

	if (['true', 'false'].includes(resolved.toLocaleLowerCase())) {
		return applySections({
			options,
			recommended: ['toBoolean()', ...STRING_RECOMMENDED_OPTIONS],
			sections: STRING_SECTIONS,
		});
	}

	return applySections({
		options,
		recommended: STRING_RECOMMENDED_OPTIONS,
		sections: STRING_SECTIONS,
	});
};

const booleanOptions = (input: AutocompleteInput<boolean>): Completion[] => {
	return applySections({
		options: sortCompletionsAlpha([
			...natives({ typeName: 'boolean', base: input.base }),
			...extensions({ typeName: 'boolean', base: input.base }),
		]),
	});
};

const numberOptions = (input: AutocompleteInput<number>): Completion[] => {
	const { base, resolved, transformLabel } = input;
	const options = sortCompletionsAlpha([
		...natives({ typeName: 'number', base, transformLabel }),
		...extensions({ typeName: 'number', base, includeHidden: false, transformLabel }),
	]);
	const ONLY_INTEGER = ['isEven()', 'isOdd()'];

	if (Number.isInteger(resolved)) {
		const nowMillis = Date.now();
		const marginMillis = 946_707_779_000; // 30y
		const isPlausableMillisDateTime =
			resolved > nowMillis - marginMillis && resolved < nowMillis + marginMillis;

		if (isPlausableMillisDateTime) {
			return applySections({
				options,
				recommended: [{ label: 'toDateTime()', args: ['ms'] }],
			});
		}

		const nowSeconds = nowMillis / 1000;
		const marginSeconds = marginMillis / 1000;
		const isPlausableSecondsDateTime =
			resolved > nowSeconds - marginSeconds && resolved < nowSeconds + marginSeconds;
		if (isPlausableSecondsDateTime) {
			return applySections({
				options,
				recommended: [{ label: 'toDateTime()', args: ['s'] }],
			});
		}

		if (resolved === 0 || resolved === 1) {
			return applySections({
				options,
				recommended: ['toBoolean()'],
			});
		}

		return applySections({
			options,
			recommended: ONLY_INTEGER,
		});
	} else {
		const exclude = new Set(ONLY_INTEGER);
		return applySections({
			options: options.filter((option) => !exclude.has(option.label)),
			recommended: ['round()', 'floor()', 'ceil()'],
		});
	}
};

const dateOptions = (input: AutocompleteInput<Date>): Completion[] => {
	const { transformLabel, base } = input;
	return applySections({
		options: sortCompletionsAlpha([
			...natives({ typeName: 'date', base, transformLabel }),
			...extensions({ typeName: 'date', base, includeHidden: true, transformLabel }),
		]),
		recommended: DATE_RECOMMENDED_OPTIONS,
	});
};

const luxonOptions = (input: AutocompleteInput<DateTime>): Completion[] => {
	const { transformLabel, base } = input;
	return applySections({
		options: sortCompletionsAlpha(
			uniqBy(
				[
					...extensions({ typeName: 'date', base, includeHidden: false, transformLabel }),
					...luxonInstanceOptions({ base, includeHidden: false, transformLabel }),
				],
				(option) => option.label,
			),
		),
		recommended: LUXON_RECOMMENDED_OPTIONS,
		sections: LUXON_SECTIONS,
	});
};

const arrayOptions = (input: AutocompleteInput<unknown[]>): Completion[] => {
	const { base, resolved, transformLabel } = input;
	const options = applySections({
		options: sortCompletionsAlpha([
			...natives({ typeName: 'array', base, transformLabel }),
			...extensions({ typeName: 'array', base, includeHidden: false, transformLabel }),
		]),
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

export const variablesOptions = (base: string) => {
	const environmentsStore = useEnvironmentsStore();
	const variables = environmentsStore.variables;

	return variables.map((variable) =>
		createCompletionOption({
			base,
			name: variable.key,
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
			createCompletionOption({
				base,
				name: secret,
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

export const secretProvidersOptions = (base: string) => {
	const externalSecretsStore = useExternalSecretsStore();

	return Object.keys(externalSecretsStore.secretsAsObject).map((provider) =>
		createCompletionOption({
			base,
			name: provider,
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
export const luxonInstanceOptions = ({
	base,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	base: string;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}) => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	return Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';
			return createLuxonAutocompleteOption({
				base,
				name: key,
				isFunction,
				docs: luxonInstanceDocs,
				translations: i18n.luxonInstance,
				includeHidden,
				transformLabel,
			}) as Completion;
		})
		.filter(Boolean);
};

/**
 * Methods defined on a Luxon `DateTime` class.
 */
export const luxonStaticOptions = (base: string) => {
	const SKIP = new Set(['prototype', 'name', 'length', 'invalid']);

	return sortCompletionsAlpha(
		Object.keys(Object.getOwnPropertyDescriptors(DateTime))
			.filter((key) => !SKIP.has(key) && !key.includes('_'))
			.map((key) => {
				return createLuxonAutocompleteOption({
					base,
					name: key,
					isFunction: true,
					docs: luxonStaticDocs,
					translations: i18n.luxonStatic,
				}) as Completion;
			})
			.filter(Boolean),
	);
};

const createLuxonAutocompleteOption = ({
	name,
	base,
	docs,
	translations,
	isFunction = false,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	name: string;
	base: string;
	docs: NativeDoc;
	translations: Record<string, string | undefined>;
	isFunction?: boolean;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}): Completion | null => {
	const label = isFunction ? name + '()' : name;

	let doc: DocMetadata | undefined;
	if (docs.properties && docs.properties.hasOwnProperty(name)) {
		doc = docs.properties[name].doc;
	} else if (docs.functions.hasOwnProperty(name)) {
		doc = docs.functions[name].doc;
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

	if (!doc || (doc?.hidden && !includeHidden)) {
		return null;
	}

	const option: Completion = {
		label,
		section: doc?.section,
		apply: applyCompletion({
			hasArgs: hasRequiredArgs(doc),
			defaultArgs: getDefaultArgs(doc),
			transformLabel,
		}),
	};
	option.info = createCompletionOption({
		base,
		name,
		isFunction,
		// Add translated description
		doc: { ...doc, description: translations[name] } as DocMetadata,
		transformLabel,
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
	arrayLiteral: /\(?(\[.*\])\)?\.(.*)/, // [1, 2, 3].
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
