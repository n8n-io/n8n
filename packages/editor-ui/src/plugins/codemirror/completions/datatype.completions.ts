import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { VALID_EMAIL_REGEX } from '@/constants';
import { i18n } from '@/plugins/i18n';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';

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
import { createInfoBoxRenderer } from './infoBoxRenderer';
import { luxonInstanceDocs } from './nativesAutocompleteDocs/luxon.instance.docs';
import { luxonStaticDocs } from './nativesAutocompleteDocs/luxon.static.docs';
import type { AutocompleteInput, ExtensionTypeName, FnToDoc, Resolved } from './types';
import {
	applyBracketAccessCompletion,
	applyCompletion,
	getDefaultArgs,
	getDisplayType,
	hasNoParams,
	hasRequiredArgs,
	insertDefaultArgs,
	isAllowedInDotNotation,
	isCredentialsModalOpen,
	isPseudoParam,
	isSplitInBatchesAbsent,
	longestCommonPrefix,
	prefixMatch,
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
		} catch (error) {
			return null;
		}

		if (resolved === null) return null;

		try {
			options = datatypeOptions({ resolved, base, tail }).map(stripExcessParens(context));
		} catch (error) {
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
		return booleanOptions();
	}

	if (DateTime.isDateTime(resolved)) {
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
	transformLabel = (label) => label,
}: {
	typeName: ExtensionTypeName;
	transformLabel?: (label: string) => string;
}): Completion[] => {
	const nativeDocs = NativeMethods.find((ee) => ee.typeName.toLowerCase() === typeName);

	if (!nativeDocs) return [];

	const nativeProps = nativeDocs.properties
		? toOptions({
				fnToDoc: nativeDocs.properties,
				includeHidden: false,
				isFunction: false,
				transformLabel,
			})
		: [];

	const nativeMethods = toOptions({
		fnToDoc: nativeDocs.functions,
		includeHidden: false,
		isFunction: true,
		transformLabel,
	});

	return [...nativeProps, ...nativeMethods];
};

export const extensions = ({
	typeName,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	typeName: ExtensionTypeName;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}) => {
	const expressionExtensions = ExpressionExtensions.find(
		(ee) => ee.typeName.toLowerCase() === typeName,
	);

	if (!expressionExtensions) return [];

	const fnToDoc = Object.entries(expressionExtensions.functions).reduce<FnToDoc>(
		(acc, [fnName, fn]) => {
			// Extension method docs do not have more info than info box, do not show
			delete fn.doc?.docURL;
			return { ...acc, [fnName]: { doc: fn.doc } };
		},
		{},
	);

	return toOptions({ fnToDoc, isFunction: true, includeHidden, transformLabel });
};

export const isInputData = (base: string): boolean => {
	return (
		/^\$input\..*\.json]/.test(base) || /^\$json/.test(base) || /^\$\(.*\)\..*\.json/.test(base)
	);
};

export const isItem = (input: AutocompleteInput<IDataObject>): boolean => {
	const { base, resolved } = input;
	return /^(\$\(.*\)|\$input)/.test(base) && 'pairedItem' in resolved;
};

export const isBinary = (input: AutocompleteInput<IDataObject>): boolean => {
	const { base, resolved } = input;
	return (
		/^(\$\(.*\)\..*\.binary\..*|\$binary)/.test(base) &&
		'mimeType' in resolved &&
		'fileExtension' in resolved
	);
};

export const getDetail = (base: string, value: unknown): string | undefined => {
	const type = getDisplayType(value);
	if (!isInputData(base) || type === 'function') return undefined;
	return type;
};

export const toOptions = ({
	fnToDoc,
	isFunction = false,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	fnToDoc: FnToDoc;
	isFunction?: boolean;
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
}) => {
	return Object.entries(fnToDoc)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.filter(([, docInfo]) => Boolean(docInfo.doc && !docInfo.doc?.hidden) || includeHidden)
		.map(([fnName, docInfo]) => {
			return createCompletionOption({
				name: fnName,
				doc: docInfo.doc,
				isFunction,
				transformLabel,
			});
		});
};

const createCompletionOption = ({
	name,
	doc,
	isFunction = false,
	transformLabel = (label) => label,
}: {
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
	option.info = createInfoBoxRenderer(doc, isFunction);

	return option;
};

const customObjectOptions = (input: AutocompleteInput<IDataObject>): Completion[] => {
	const { base, resolved } = input;

	if (!resolved) return [];

	if (base === '$execution') {
		return executionOptions();
	} else if (base === '$execution.customData') {
		return customDataOptions();
	} else if (base === '$workflow') {
		return workflowOptions();
	} else if (base === '$input') {
		return inputOptions(base);
	} else if (base === '$prevNode') {
		return prevNodeOptions();
	} else if (/^\$\(['"][\S\s]+['"]\)$/.test(base)) {
		return nodeRefOptions(base);
	} else if (base === '$response') {
		return responseOptions();
	} else if (isItem(input)) {
		return itemOptions();
	} else if (isBinary(input)) {
		return binaryOptions();
	}

	return [];
};

const objectOptions = (input: AutocompleteInput<IDataObject>): Completion[] => {
	const { base, resolved, transformLabel = (label) => label } = input;
	const SKIP = new Set(['__ob__', 'pairedItem']);

	if (isSplitInBatchesAbsent()) SKIP.add('context');

	let rawKeys = Object.keys(resolved);

	if (base === 'Math') {
		const descriptors = Object.getOwnPropertyDescriptors(Math);
		rawKeys = Object.keys(descriptors).sort((a, b) => a.localeCompare(b));
	}

	const customOptions = customObjectOptions(input);
	if (customOptions.length > 0) {
		// Only return completions that are present in the resolved data
		return customOptions.filter((option) => option.label in resolved);
	}

	const localKeys = rawKeys
		.filter((key) => !SKIP.has(key) && !isPseudoParam(key))
		.map((key) => {
			ensureKeyCanBeResolved(resolved, key);
			const needsBracketAccess = !isAllowedInDotNotation(key);
			const resolvedProp = resolved[key];

			const isFunction = typeof resolvedProp === 'function';
			const hasArgs = isFunction && resolvedProp.length > 0;

			const option: Completion = {
				label: isFunction ? key + '()' : key,
				section: isFunction ? METHODS_SECTION : FIELDS_SECTION,
				apply: needsBracketAccess
					? applyBracketAccessCompletion
					: applyCompletion({
							hasArgs,
							transformLabel,
						}),
				detail: getDetail(base, resolvedProp),
			};

			return option;
		});

	const skipObjectExtensions =
		resolved.isProxy ||
		resolved.json ||
		/json('])$/.test(base) ||
		base === '$execution' ||
		base.endsWith('params') ||
		base.endsWith('binary') ||
		base === 'Math';

	if (skipObjectExtensions) {
		return sortCompletionsAlpha([...localKeys, ...natives({ typeName: 'object' })]);
	}

	return applySections({
		options: sortCompletionsAlpha([
			...localKeys,
			...natives({ typeName: 'object' }),
			...extensions({ typeName: 'object' }),
		]),
		recommended: OBJECT_RECOMMENDED_OPTIONS,
		recommendedSection: RECOMMENDED_METHODS_SECTION,
		propSection: FIELDS_SECTION,
		methodsSection: OTHER_METHODS_SECTION,
		excludeRecommended: true,
	});
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
	const { resolved, transformLabel } = input;
	const options = sortCompletionsAlpha([
		...natives({ typeName: 'string', transformLabel }),
		...extensions({ typeName: 'string', includeHidden: false, transformLabel }),
	]);

	if (resolved && validateFieldType('string', resolved, 'number').valid) {
		const recommended = ['toNumber()'];
		const timestampUnit = toTimestampUnit(Number(resolved));

		if (timestampUnit) {
			return applySections({
				options,
				recommended: [...recommended, { label: 'toDateTime()', args: [`'${timestampUnit}'`] }],
				sections: STRING_SECTIONS,
			});
		}

		return applySections({
			options,
			recommended,
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

const booleanOptions = (): Completion[] => {
	return applySections({
		options: sortCompletionsAlpha([
			...natives({ typeName: 'boolean' }),
			...extensions({ typeName: 'boolean' }),
		]),
	});
};

const isWithinMargin = (ts: number, now: number, margin: number): boolean => {
	return ts > now - margin && ts < now + margin;
};

const toTimestampUnit = (ts: number): null | 'ms' | 's' | 'us' => {
	const nowMillis = Date.now();
	const marginMillis = 946_707_779_000; // 30y

	if (isWithinMargin(ts, nowMillis, marginMillis)) {
		return 'ms';
	}

	if (isWithinMargin(ts, nowMillis / 1000, marginMillis / 1000)) {
		return 's';
	}

	if (isWithinMargin(ts, nowMillis * 1000, marginMillis * 1000)) {
		return 'us';
	}

	return null;
};

const numberOptions = (input: AutocompleteInput<number>): Completion[] => {
	const { resolved, transformLabel } = input;
	const options = sortCompletionsAlpha([
		...natives({ typeName: 'number', transformLabel }),
		...extensions({ typeName: 'number', includeHidden: false, transformLabel }),
	]);
	const ONLY_INTEGER = ['isEven()', 'isOdd()'];

	if (Number.isInteger(resolved)) {
		const timestampUnit = toTimestampUnit(resolved);
		if (timestampUnit) {
			return applySections({
				options,
				recommended: [{ label: 'toDateTime()', args: [`'${timestampUnit}'`] }],
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
	const { transformLabel } = input;
	return extensions({ typeName: 'date', includeHidden: true, transformLabel }).filter(
		(ext) => ext.label === 'toDateTime()',
	);
};

const luxonOptions = (input: AutocompleteInput<DateTime>): Completion[] => {
	const { transformLabel } = input;
	const result = applySections({
		options: sortCompletionsAlpha(
			uniqBy(
				[
					...extensions({ typeName: 'date', includeHidden: false, transformLabel }),
					...luxonInstanceOptions({ includeHidden: false, transformLabel }),
				],
				(option) => option.label,
			),
		),
		recommended: LUXON_RECOMMENDED_OPTIONS,
		sections: LUXON_SECTIONS,
	});

	return result;
};

const arrayOptions = (input: AutocompleteInput<unknown[]>): Completion[] => {
	const { resolved, transformLabel } = input;
	const options = applySections({
		options: sortCompletionsAlpha([
			...natives({ typeName: 'array', transformLabel }),
			...extensions({ typeName: 'array', includeHidden: false, transformLabel }),
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

export const variablesOptions = () => {
	const environmentsStore = useEnvironmentsStore();
	const variables = environmentsStore.variables;

	return variables.map((variable) =>
		createCompletionOption({
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

export const responseOptions = () => {
	return [
		{
			name: 'statusCode',
			returnType: 'number',
			docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
			description: i18n.baseText('codeNodeEditor.completer.$response.statusCode'),
		},
		{
			name: 'statusMessage',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$response.statusMessage'),
		},
		{
			name: 'headers',
			returnType: 'Object',
			docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
			description: i18n.baseText('codeNodeEditor.completer.$response.headers'),
		},
		{
			name: 'body',
			returnType: 'Object',
			docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
			description: i18n.baseText('codeNodeEditor.completer.$response.body'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
};

export const executionOptions = () => {
	return [
		{
			name: 'id',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$execution.id'),
		},
		{
			name: 'mode',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$execution.mode'),
		},

		{
			name: 'resumeUrl',
			returnType: 'string',
			docURL: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.resumeUrl'),
		},
		{
			name: 'resumeFormUrl',
			returnType: 'string',
			docURL: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.resumeFormUrl'),
		},
		{
			name: 'customData',
			returnType: 'CustomData',
			docURL: 'https://docs.n8n.io/workflows/executions/custom-executions-data/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.customData'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
};

export const customDataOptions = () => {
	return [
		{
			name: 'get',
			returnType: 'any',
			docURL: 'https://docs.n8n.io/workflows/executions/custom-executions-data/',
			args: [
				{
					name: 'key',
					description: 'The key (identifier) under which the data is stored',
					type: 'string',
				},
			],
			description: i18n.baseText('codeNodeEditor.completer.$execution.customData.get'),
			examples: [
				{
					description: i18n.baseText(
						'codeNodeEditor.completer.$execution.customData.get.examples.1',
					),
					example: '$execution.customData.get("user_email")',
					evaluated: '"me@example.com"',
				},
			],
		},
		{
			name: 'set',
			returnType: 'void',
			args: [
				{
					name: 'key',
					description: i18n.baseText('codeNodeEditor.completer.$execution.customData.set.args.key'),
					type: 'string',
				},
				{
					name: 'value',
					description: i18n.baseText(
						'codeNodeEditor.completer.$execution.customData.set.args.value',
					),
					type: 'any',
				},
			],
			docURL: 'https://docs.n8n.io/workflows/executions/custom-executions-data/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.customData.set'),
			examples: [
				{
					description: i18n.baseText(
						'codeNodeEditor.completer.$execution.customData.set.examples.1',
					),
					example: '$execution.customData.set("user_email", "me@example.com")',
				},
			],
		},
		{
			name: 'getAll',
			returnType: 'Object',
			docURL: 'https://docs.n8n.io/workflows/executions/custom-executions-data/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.customData.getAll'),
			examples: [
				{
					example: '$execution.customData.getAll()',
					evaluated: '{ user_email: "me@example.com", id: 1234 }',
				},
			],
		},
		{
			name: 'setAll',
			returnType: 'void',
			args: [
				{
					name: 'obj',
					description: i18n.baseText(
						'codeNodeEditor.completer.$execution.customData.setAll.args.obj',
					),
					type: 'object',
				},
			],
			docURL: 'https://docs.n8n.io/workflows/executions/custom-executions-data/',
			description: i18n.baseText('codeNodeEditor.completer.$execution.customData.setAll'),
			examples: [
				{ example: '$execution.customData.setAll({ user_email: "me@example.com", id: 1234 })' },
			],
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc, isFunction: true }));
};

export const nodeRefOptions = (base: string) => {
	const itemArgs = [
		{
			name: 'branchIndex',
			optional: true,
			description: i18n.baseText('codeNodeEditor.completer.selector.args.branchIndex'),
			default: '0',
			type: 'number',
		},
		{
			name: 'runIndex',
			optional: true,
			description: i18n.baseText('codeNodeEditor.completer.selector.args.runIndex'),
			default: '0',
			type: 'number',
		},
	];

	const options: Array<{ doc: DocMetadata; isFunction?: boolean }> = [
		{
			doc: {
				name: 'item',
				returnType: 'Item',
				docURL: 'https://docs.n8n.io/data/data-mapping/data-item-linking/',
				description: i18n.baseText('codeNodeEditor.completer.selector.item'),
			},
		},
		{
			doc: {
				name: 'isExecuted',
				returnType: 'boolean',
				description: i18n.baseText('codeNodeEditor.completer.selector.isExecuted'),
			},
		},
		{
			doc: {
				name: 'params',
				returnType: 'NodeParams',
				description: i18n.baseText('codeNodeEditor.completer.selector.params'),
			},
		},
		{
			doc: {
				name: 'itemMatching',
				returnType: 'Item',
				args: [
					{
						name: 'currentItemIndex',
						description: i18n.baseText(
							'codeNodeEditor.completer.selector.itemMatching.args.currentItemIndex',
						),
						default: '0',
						type: 'number',
					},
				],
				docURL: 'https://docs.n8n.io/data/data-mapping/data-item-linking/',
				description: i18n.baseText('codeNodeEditor.completer.selector.itemMatching'),
			},
			isFunction: true,
		},
		{
			doc: {
				name: 'first',
				returnType: 'Item',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.first'),
			},
			isFunction: true,
		},
		{
			doc: {
				name: 'last',
				returnType: 'Item',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.last'),
			},
			isFunction: true,
		},
		{
			doc: {
				name: 'all',
				returnType: 'Item[]',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.all'),
			},
			isFunction: true,
		},
	];

	return applySections({
		options: options
			.filter((option) => !(option.doc.name === 'params' && hasNoParams(base)))
			.map(({ doc, isFunction }) => createCompletionOption({ name: doc.name, doc, isFunction })),
		sections: {},
		recommended: ['item'],
	});
};

export const inputOptions = (base: string) => {
	const itemArgs = [
		{
			name: 'branchIndex',
			optional: true,
			description: i18n.baseText('codeNodeEditor.completer.selector.args.branchIndex'),
			default: '0',
			type: 'number',
		},
		{
			name: 'runIndex',
			optional: true,
			description: i18n.baseText('codeNodeEditor.completer.selector.args.runIndex'),
			default: '0',
			type: 'number',
		},
	];

	const options: Array<{ doc: DocMetadata; isFunction?: boolean }> = [
		{
			doc: {
				name: 'item',
				returnType: 'Item',
				docURL: 'https://docs.n8n.io/data/data-mapping/data-item-linking/',
				description: i18n.baseText('codeNodeEditor.completer.selector.item'),
			},
		},
		{
			doc: {
				name: 'params',
				returnType: 'NodeParams',
				description: i18n.baseText('codeNodeEditor.completer.selector.params'),
			},
		},
		{
			doc: {
				name: 'first',
				returnType: 'Item',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.first'),
			},
			isFunction: true,
		},
		{
			doc: {
				name: 'last',
				returnType: 'Item',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.last'),
			},
			isFunction: true,
		},
		{
			doc: {
				name: 'all',
				returnType: 'Item[]',
				args: itemArgs,
				description: i18n.baseText('codeNodeEditor.completer.selector.all'),
			},
			isFunction: true,
		},
	];

	return applySections({
		options: options
			.filter((option) => !(option.doc.name === 'params' && hasNoParams(base)))
			.map(({ doc, isFunction }) => createCompletionOption({ name: doc.name, doc, isFunction })),
		recommended: ['item'],
		sections: {},
	});
};

export const prevNodeOptions = () => {
	return [
		{
			name: 'name',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$prevNode.name'),
		},
		{
			name: 'outputIndex',
			returnType: 'number',
			description: i18n.baseText('codeNodeEditor.completer.$prevNode.outputIndex'),
		},
		{
			name: 'runIndex',
			returnType: 'number',
			description: i18n.baseText('codeNodeEditor.completer.$prevNode.runIndex'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
};

export const itemOptions = () => {
	return [
		{
			name: 'json',
			returnType: 'Object',
			docURL: 'https://docs.n8n.io/data/data-structure/',
			description: i18n.baseText('codeNodeEditor.completer.item.json'),
		},
		{
			name: 'binary',
			returnType: 'Object',
			docURL: 'https://docs.n8n.io/data/data-structure/',
			description: i18n.baseText('codeNodeEditor.completer.item.binary'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
};

export const binaryOptions = () => {
	return [
		{
			name: 'id',
			returnType: 'String',
			description: i18n.baseText('codeNodeEditor.completer.binary.id'),
		},
		{
			name: 'fileExtension',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.binary.fileExtension'),
		},
		{
			name: 'fileName',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.binary.fileName'),
		},
		{
			name: 'fileSize',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.binary.fileSize'),
		},
		{
			name: 'fileType',
			returnType: 'String',
			description: i18n.baseText('codeNodeEditor.completer.binary.fileType'),
		},
		{
			name: 'mimeType',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.binary.mimeType'),
		},
		{
			name: 'directory',
			returnType: 'String',
			description: i18n.baseText('codeNodeEditor.completer.binary.directory'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
};

export const workflowOptions = () => {
	return [
		{
			name: 'id',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$workflow.id'),
		},
		{
			name: 'name',
			returnType: 'string',
			description: i18n.baseText('codeNodeEditor.completer.$workflow.name'),
		},
		{
			name: 'active',
			returnType: 'boolean',
			description: i18n.baseText('codeNodeEditor.completer.$workflow.active'),
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc }));
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

export const secretProvidersOptions = () => {
	const externalSecretsStore = useExternalSecretsStore();

	return Object.keys(externalSecretsStore.secretsAsObject).map((provider) =>
		createCompletionOption({
			name: provider,
			doc: {
				name: provider,
				returnType: 'Object',
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
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	includeHidden?: boolean;
	transformLabel?: (label: string) => string;
} = {}) => {
	const SKIP = new Set(['constructor', 'get', 'invalidExplanation', 'invalidReason']);

	return Object.entries(Object.getOwnPropertyDescriptors(DateTime.prototype))
		.filter(([key]) => !SKIP.has(key))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, descriptor]) => {
			const isFunction = typeof descriptor.value === 'function';
			return createLuxonAutocompleteOption({
				name: key,
				isFunction,
				docs: luxonInstanceDocs,
				includeHidden,
				transformLabel,
			}) as Completion;
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
				return createLuxonAutocompleteOption({
					name: key,
					isFunction: true,
					docs: luxonStaticDocs,
				}) as Completion;
			})
			.filter(Boolean),
	);
};

const createLuxonAutocompleteOption = ({
	name,
	docs,
	isFunction = false,
	includeHidden = false,
	transformLabel = (label) => label,
}: {
	name: string;
	docs: NativeDoc;
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
		name,
		isFunction,
		doc,
		transformLabel,
	}).info;
	return option;
};

/**
 * Methods defined on the global `Object`.
 */
export const objectGlobalOptions = () => {
	return [
		{
			name: 'assign',
			description: i18n.baseText('codeNodeEditor.completer.globalObject.assign'),
			args: [
				{
					name: 'target',
					type: 'object',
				},
				{
					name: 'sources',
					variadic: true,
					type: 'object',
				},
			],
			examples: [
				{
					example: "Object.assign(\n  {},\n  { id: 1, name: 'Apple' },\n  { name: 'Banana' }\n);",
					evaluated: "{ id: 1, name: 'Banana' }",
				},
			],
			returnType: 'Object',
			docURL:
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign',
		},
		{
			name: 'entries',
			returnType: 'Array<[string, any]>',
			args: [
				{
					name: 'obj',
					type: 'object',
				},
			],
			examples: [
				{
					example: "Object.entries({ id: 1, name: 'Apple' })",
					evaluated: "[['id', 1], ['name', 'Apple']]",
				},
			],
			description: i18n.baseText('codeNodeEditor.completer.globalObject.entries'),
			docURL:
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries',
		},
		{
			name: 'keys',
			args: [
				{
					name: 'obj',
					type: 'object',
				},
			],
			examples: [
				{
					example: "Object.keys({ id: 1, name: 'Apple' })",
					evaluated: "['id', 'name']",
				},
			],
			returnType: 'string[]',
			description: i18n.baseText('codeNodeEditor.completer.globalObject.keys'),
			docURL:
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys',
		},
		{
			name: 'values',
			args: [
				{
					name: 'obj',
					type: 'object',
				},
			],
			examples: [
				{
					example: "Object.values({ id: 1, name: 'Apple' })",
					evaluated: "[1, 'Apple']",
				},
			],
			description: i18n.baseText('codeNodeEditor.completer.globalObject.values'),
			returnType: 'Array',
			docURL:
				'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values',
		},
	].map((doc) => createCompletionOption({ name: doc.name, doc, isFunction: true }));
};

const regexes = {
	generalRef: /\$[^$'"]+\.(.*)/, // $input. or $json. or similar ones
	selectorRef: /\$\(['"][\S\s]+['"]\)\.(.*)/, // $('nodeName').

	numberLiteral: /\((\d+)\.?(\d*)\)\.(.*)/, // (123). or (123.4).
	singleQuoteStringLiteral: /('.*')\.([^'{\s])*/, // 'abc'.
	booleanLiteral: /(true|false)\.([^'{\s])*/, // true.
	doubleQuoteStringLiteral: /(".*")\.([^"{\s])*/, // "abc".
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
