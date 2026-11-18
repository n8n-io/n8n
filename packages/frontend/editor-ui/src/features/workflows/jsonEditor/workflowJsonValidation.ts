import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { toResult } from '@n8n/utils/result';
import countBy from 'lodash/countBy';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import uniqBy from 'lodash/uniqBy';
import {
	NodeHelpers,
	isCommunityPackageName,
	isExpression,
	isFromAIOnlyExpression,
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
	isNodeConnectionType,
	isNodeParameters,
	isValidNodeParameterValueType,
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';

import type { INodeUi } from '@/Interface';

import type { JsonPath, WorkflowJsonIssue } from './workflowJson.types';
import { NODE_FIELD_KEYS } from './workflowJsonChanges';
import {
	createNodeNameResolver,
	type NodeIdentity,
	type NodeNameResolver,
} from './workflowJsonReferences';

export type WorkflowJsonValidationDeps = {
	/** Exact version, like `nodeTypesStore.getNodeType`. Without a version it returns the latest one. */
	getNodeType: (type: string, version?: number) => INodeTypeDescription | null;
	getNodeVersions: (type: string) => number[];
	credentialExists: (id: string, credentialType: string) => boolean;
	/**
	 * The node with this ID on the canvas, in the saved form that Apply compares with. Apply leaves
	 * what did not change alone, so a problem there is only a warning. Without it, every node is new.
	 */
	getCurrentNode?: (id: string) => INode | undefined;
};

export type WorkflowJsonValidationContext = {
	/** The nodes when editing started. A reference that uses an old name resolves through them. */
	baseNodes: Array<{ id: string; name: string }>;
};

type ParameterContext = {
	description: INodeTypeDescription;
	node: INode;
	/** Resolved values of the whole node. Undefined when they could not be resolved: then only shapes are checked. */
	root: INodeParameters | undefined;
	/** Parameters of the node on the canvas, when it keeps its type and version. */
	before: INodeParameters | undefined;
	/** Path of the node parameters, to find the value of a path in `before`. */
	parametersPath: JsonPath;
};

type FieldKind = 'string' | 'number' | 'boolean' | 'object';

const i18n = useI18n();

const text = (key: BaseTextKey, interpolate?: Record<string, string | number>) =>
	i18n.baseText(key, { interpolate });

const error = (path: JsonPath, message: string): WorkflowJsonIssue => ({
	severity: 'error',
	path,
	message,
});

const warning = (path: JsonPath, message: string): WorkflowJsonIssue => ({
	severity: 'warning',
	path,
	message,
});

const isString = (value: unknown): value is string => typeof value === 'string';

const isPosition = (value: unknown) =>
	Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number');

const isInputIndex = (value: unknown) =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0;

const WORKFLOW_FIELDS = new Set(['name', 'nodes', 'connections', 'pinData', 'settings']);

const FIELD_KINDS: Record<
	FieldKind,
	{ matches: (value: unknown) => boolean; message: BaseTextKey }
> = {
	string: { matches: isString, message: 'workflowJsonPanel.validation.expectedString' },
	number: {
		matches: (value) => typeof value === 'number',
		message: 'workflowJsonPanel.validation.expectedNumber',
	},
	boolean: {
		matches: (value) => typeof value === 'boolean',
		message: 'workflowJsonPanel.validation.expectedBoolean',
	},
	object: { matches: isRecord, message: 'workflowJsonPanel.validation.expectedObject' },
};

/** Node fields that only need the right JSON type. */
const OPTIONAL_NODE_FIELDS = {
	disabled: 'boolean',
	notes: 'string',
	notesInFlow: 'boolean',
	retryOnFail: 'boolean',
	maxTries: 'number',
	waitBetweenTries: 'number',
	alwaysOutputData: 'boolean',
	executeOnce: 'boolean',
	onError: 'string',
	continueOnFail: 'boolean',
	customTelemetryTags: 'object',
	webhookId: 'string',
	extendsCredential: 'string',
	rewireOutputLogTo: 'string',
	forceCustomOperation: 'object',
	placeholder: 'boolean',
	color: 'string',
} satisfies Partial<Record<keyof INodeUi, FieldKind>>;

const NODE_FIELDS = new Set<string>([
	'id',
	'name',
	'type',
	'typeVersion',
	'position',
	'parameters',
	'credentials',
	...Object.keys(OPTIONAL_NODE_FIELDS),
]);

/** Apply adds a new node with all its fields, but on a node that exists it changes only these. */
const APPLIED_NODE_FIELDS = new Set<string>([
	'id',
	'name',
	'type',
	'position',
	'parameters',
	'disabled',
	...NODE_FIELD_KEYS,
]);

function optionalFieldIssues(
	record: Record<string, unknown>,
	key: string,
	at: JsonPath,
	isValid: (value: unknown) => boolean,
	invalidMessage: string,
): WorkflowJsonIssue[] {
	const value = record[key];
	return value === undefined || isValid(value) ? [] : [error([...at, key], invalidMessage)];
}

function requiredFieldIssues(
	record: Record<string, unknown>,
	key: string,
	at: JsonPath,
	isValid: (value: unknown) => boolean,
	invalidMessage: string,
): WorkflowJsonIssue[] {
	return record[key] === undefined
		? [error([...at, key], text('workflowJsonPanel.validation.missingField', { key }))]
		: optionalFieldIssues(record, key, at, isValid, invalidMessage);
}

function nonEmptyStringIssues(
	record: Record<string, unknown>,
	key: string,
	at: JsonPath,
): WorkflowJsonIssue[] {
	const invalidMessage = isString(record[key])
		? text('workflowJsonPanel.validation.emptyField', { key })
		: text('workflowJsonPanel.validation.expectedString', { key });
	return requiredFieldIssues(
		record,
		key,
		at,
		(value) => isString(value) && value.trim() !== '',
		invalidMessage,
	);
}

function referenceIssues(
	name: string,
	path: JsonPath,
	resolve: NodeNameResolver,
): WorkflowJsonIssue[] {
	const reference = resolve(name);
	if (!reference) return [error(path, text('workflowJsonPanel.validation.nodeNotFound', { name }))];
	return reference.renamedFrom
		? [
				warning(
					path,
					text('workflowJsonPanel.validation.oldNodeName', {
						oldName: reference.renamedFrom,
						newName: reference.name,
					}),
				),
			]
		: [];
}

function workflowShapeIssues(json: Record<string, unknown>): WorkflowJsonIssue[] {
	return [
		...Object.keys(json)
			.filter((key) => !WORKFLOW_FIELDS.has(key))
			.map((key) =>
				warning([key], text('workflowJsonPanel.validation.unknownWorkflowField', { key })),
			),
		...optionalFieldIssues(
			json,
			'name',
			[],
			isString,
			text('workflowJsonPanel.validation.expectedString', { key: 'name' }),
		),
		...requiredFieldIssues(
			json,
			'nodes',
			[],
			Array.isArray,
			text('workflowJsonPanel.validation.expectedArray', { key: 'nodes' }),
		),
		...requiredFieldIssues(
			json,
			'connections',
			[],
			isRecord,
			text('workflowJsonPanel.validation.expectedObject', { key: 'connections' }),
		),
	];
}

function credentialShapeIssues(node: Record<string, unknown>, at: JsonPath): WorkflowJsonIssue[] {
	const { credentials } = node;
	const path = [...at, 'credentials'];
	if (credentials === undefined) return [];
	if (!isRecord(credentials)) {
		return [
			error(path, text('workflowJsonPanel.validation.expectedObject', { key: 'credentials' })),
		];
	}
	return Object.entries(credentials).flatMap(([credentialType, details]) => {
		const detailsPath = [...path, credentialType];
		if (!isRecord(details)) {
			return [
				error(
					detailsPath,
					text('workflowJsonPanel.validation.expectedObject', { key: credentialType }),
				),
			];
		}
		return [
			...requiredFieldIssues(
				details,
				'id',
				detailsPath,
				(id) => id === null || isString(id),
				text('workflowJsonPanel.validation.credentialIdInvalid'),
			),
			...requiredFieldIssues(
				details,
				'name',
				detailsPath,
				isString,
				text('workflowJsonPanel.validation.expectedString', { key: 'name' }),
			),
		];
	});
}

/** On a node that exists, Apply ignores a change to a field outside APPLIED_NODE_FIELDS. */
function unappliedFieldIssues(
	node: Record<string, unknown>,
	at: JsonPath,
	existing: INode | undefined,
): WorkflowJsonIssue[] {
	const before: Record<string, unknown> = isRecord(existing) ? existing : {};
	return [...new Set([...Object.keys(node), ...Object.keys(before)])]
		.filter((key) => !APPLIED_NODE_FIELDS.has(key) && !isEqual(node[key], before[key]))
		.flatMap((key) => {
			if (!NODE_FIELDS.has(key)) {
				return [
					warning([...at, key], text('workflowJsonPanel.validation.unknownNodeField', { key })),
				];
			}
			return existing
				? [warning([...at, key], text('workflowJsonPanel.validation.nodeFieldNotApplied', { key }))]
				: [];
		});
}

function nodeShapeIssues(
	node: Record<string, unknown>,
	at: JsonPath,
	existing: INode | undefined,
): WorkflowJsonIssue[] {
	return [
		...nonEmptyStringIssues(node, 'name', at),
		...nonEmptyStringIssues(node, 'type', at),
		...requiredFieldIssues(
			node,
			'typeVersion',
			at,
			FIELD_KINDS.number.matches,
			text('workflowJsonPanel.validation.expectedNumber', { key: 'typeVersion' }),
		),
		...(node.position === undefined
			? [warning([...at, 'position'], text('workflowJsonPanel.validation.positionMissing'))]
			: optionalFieldIssues(
					node,
					'position',
					at,
					isPosition,
					text('workflowJsonPanel.validation.positionInvalid'),
				)),
		...(node.id === undefined || node.id === ''
			? [warning([...at, 'id'], text('workflowJsonPanel.validation.idMissing'))]
			: optionalFieldIssues(
					node,
					'id',
					at,
					isString,
					text('workflowJsonPanel.validation.expectedString', { key: 'id' }),
				)),
		...optionalFieldIssues(
			node,
			'parameters',
			at,
			isRecord,
			text('workflowJsonPanel.validation.expectedObject', { key: 'parameters' }),
		),
		...credentialShapeIssues(node, at),
		...Object.entries(OPTIONAL_NODE_FIELDS).flatMap(([key, kind]) =>
			optionalFieldIssues(
				node,
				key,
				at,
				FIELD_KINDS[kind].matches,
				text(FIELD_KINDS[kind].message, { key }),
			),
		),
		...unappliedFieldIssues(node, at, existing),
	];
}

const isShown = (
	parameter: INodeProperties | INodePropertyOptions,
	level: INodeParameters,
	context: ParameterContext,
) =>
	NodeHelpers.displayParameter(level, parameter, context.node, context.description, context.root);

/** getNodeParametersIssues does not check option values, and a typo in `resource` or `operation` hides the parameters that depend on it. */
function optionValueIssues(
	property: INodeProperties,
	value: NodeParameterValueType,
	level: INodeParameters,
	path: JsonPath,
	context: ParameterContext,
): WorkflowJsonIssue[] {
	const hasStaticOptions =
		(property.type === 'options' || property.type === 'multiOptions') &&
		!property.allowArbitraryValues &&
		!property.typeOptions?.loadOptionsMethod &&
		!property.typeOptions?.loadOptions;
	// The NDV stores the default, often '', when it adds an option. The canvas reports it when it is required.
	const isSet = value !== '' && !isEqual(value, property.default);
	if (!hasStaticOptions || !isSet || !isINodePropertyOptionsList(property.options)) return [];

	const allowed = property.options.filter((option) => isShown(option, level, context));
	if (allowed.length === 0) return [];
	const values = allowed.map((option) => JSON.stringify(option.value)).join(', ');

	const problem = (candidate: unknown) => {
		if (isExpression(candidate)) {
			// getNodeParameters removes the "=" of these, except from a lone $fromAI()
			return property.noDataExpression && !isFromAIOnlyExpression(candidate)
				? text('workflowJsonPanel.validation.optionExpression', { key: property.name, values })
				: undefined;
		}
		return candidate === '' || allowed.some((option) => option.value === candidate)
			? undefined
			: text('workflowJsonPanel.validation.optionInvalid', {
					value: JSON.stringify(candidate),
					values,
				});
	};
	// Apply leaves a value that did not change alone, and n8n still runs it: the NDV only flags it too
	const previous: unknown = get(context.before, path.slice(context.parametersPath.length));
	const isUnchanged = (candidate: unknown) =>
		Array.isArray(previous) ? previous.includes(candidate) : previous === candidate;
	const issues = (candidate: unknown, candidatePath: JsonPath): WorkflowJsonIssue[] => {
		const message = problem(candidate);
		if (message === undefined) return [];
		return [
			isUnchanged(candidate) ? warning(candidatePath, message) : error(candidatePath, message),
		];
	};

	if (property.type === 'options' || isExpression(value)) return issues(value, path);
	if (!Array.isArray(value)) return [];
	const items: unknown[] = value;
	return items.flatMap((item, index) => issues(item, [...path, index]));
}

function groupIssues(
	property: INodeProperties,
	groups: INodePropertyCollection[],
	value: INodeParameters,
	kept: INodeParameters | undefined,
	path: JsonPath,
	context: ParameterContext,
): WorkflowJsonIssue[] {
	return Object.entries(value).flatMap(([groupName, groupValue]) => {
		const groupPath = [...path, groupName];
		const group = groups.find((candidate) => candidate.name === groupName);
		if (!group) {
			return kept
				? [
						warning(
							groupPath,
							text('workflowJsonPanel.validation.parameterUnknown', {
								key: groupName,
								nodeType: context.description.displayName,
							}),
						),
					]
				: [];
		}
		if (kept && !Object.hasOwn(kept, groupName)) {
			return [
				warning(
					groupPath,
					text('workflowJsonPanel.validation.parameterHidden', { key: groupName }),
				),
			];
		}

		const keptGroup = kept?.[groupName];
		if (property.typeOptions?.multipleValues !== true) {
			return isNodeParameters(groupValue)
				? parameterLevelIssues(
						group.values,
						groupValue,
						isNodeParameters(keptGroup) ? keptGroup : undefined,
						groupPath,
						context,
					)
				: [
						error(
							groupPath,
							text('workflowJsonPanel.validation.expectedObject', { key: groupName }),
						),
					];
		}

		if (!Array.isArray(groupValue)) {
			return [
				error(groupPath, text('workflowJsonPanel.validation.expectedArray', { key: groupName })),
			];
		}
		const items: unknown[] = groupValue;
		const keptItems: unknown[] = Array.isArray(keptGroup) ? keptGroup : [];
		return items.flatMap((item, index) => {
			const keptItem = keptItems[index];
			return isNodeParameters(item)
				? parameterLevelIssues(
						group.values,
						item,
						isNodeParameters(keptItem) ? keptItem : undefined,
						[...groupPath, index],
						context,
					)
				: [error([...groupPath, index], text('workflowJsonPanel.validation.itemNotAnObject'))];
		});
	});
}

function nestedParameterIssues(
	property: INodeProperties,
	key: string,
	value: NodeParameterValueType,
	kept: NodeParameterValueType | undefined,
	path: JsonPath,
	context: ParameterContext,
): WorkflowJsonIssue[] {
	const keptLevel = isNodeParameters(kept) ? kept : undefined;
	const notAnObject = [error(path, text('workflowJsonPanel.validation.expectedObject', { key }))];

	if (
		property.type === 'collection' &&
		property.typeOptions?.multipleValues !== true &&
		isINodePropertiesList(property.options)
	) {
		return isNodeParameters(value)
			? parameterLevelIssues(property.options, value, keptLevel, path, context)
			: notAnObject;
	}
	if (property.type === 'fixedCollection' && isINodePropertyCollectionList(property.options)) {
		return isNodeParameters(value)
			? groupIssues(property, property.options, value, keptLevel, path, context)
			: notAnObject;
	}
	return [];
}

/**
 * Compares the parameters in the JSON with what NodeHelpers.getNodeParameters keeps,
 * which is what Apply stores. Without `kept`, only the shapes are checked.
 */
function parameterLevelIssues(
	properties: INodeProperties[],
	input: INodeParameters,
	kept: INodeParameters | undefined,
	path: JsonPath,
	context: ParameterContext,
): WorkflowJsonIssue[] {
	return Object.entries(input).flatMap(([key, value]) => {
		const keyPath = [...path, key];
		const variants = properties.filter((property) => property.name === key);
		if (kept && !Object.hasOwn(kept, key)) {
			return [
				warning(
					keyPath,
					variants.length > 0
						? text('workflowJsonPanel.validation.parameterHidden', { key })
						: text('workflowJsonPanel.validation.parameterUnknown', {
								key,
								nodeType: context.description.displayName,
							}),
				),
			];
		}

		// A description can declare one name more than once, for example `operation` for each resource
		const property =
			(kept && variants.find((variant) => isShown(variant, kept, context))) ?? variants[0];
		if (!property) return [];
		return [
			...(kept ? optionValueIssues(property, value, kept, keyPath, context) : []),
			...nestedParameterIssues(property, key, value, kept?.[key], keyPath, context),
		];
	});
}

/** The parameter issues that the canvas shows, at the path of the top-level parameter they belong to. */
function canvasParameterIssues(
	node: INode,
	description: INodeTypeDescription,
	path: JsonPath,
): WorkflowJsonIssue[] {
	return description.properties.flatMap((property) => {
		const propertyPath = [...path, property.name];
		// getParameterIssues trusts the shape of filter and resource mapper values, so a malformed one throws
		const issues = toResult(() =>
			NodeHelpers.getParameterIssues(property, node.parameters, '', node, description),
		);
		if (!issues.ok) {
			return [
				error(
					propertyPath,
					text('workflowJsonPanel.validation.parameterValueInvalid', { key: property.name }),
				),
			];
		}
		return Object.values(issues.result.parameters ?? {})
			.flat()
			.map((message) => warning(propertyPath, message));
	});
}

function parameterIssues(
	node: INode,
	description: INodeTypeDescription,
	path: JsonPath,
	pinnedNodeNames: Set<string>,
	before: INodeParameters | undefined,
): WorkflowJsonIssue[] {
	const resolution = toResult<INodeParameters>(
		() =>
			NodeHelpers.getNodeParameters(
				description.properties,
				node.parameters,
				true,
				false,
				node,
				description,
			) ?? {},
	);
	if (!resolution.ok) {
		const shapeIssues = parameterLevelIssues(
			description.properties,
			node.parameters,
			undefined,
			path,
			{
				description,
				node,
				root: undefined,
				before,
				parametersPath: path,
			},
		);
		return shapeIssues.length > 0
			? shapeIssues
			: [
					error(
						path,
						text('workflowJsonPanel.validation.parametersInvalid', {
							message: resolution.error.message,
						}),
					),
				];
	}

	const resolved = resolution.result;
	// Like getNodeParametersIssues: the canvas shows no parameter issues on disabled or pinned nodes
	const showCanvasIssues = node.disabled !== true && !pinnedNodeNames.has(node.name);
	return [
		...parameterLevelIssues(description.properties, node.parameters, resolved, path, {
			description,
			node,
			root: resolved,
			before,
			parametersPath: path,
		}),
		...(showCanvasIssues
			? canvasParameterIssues({ ...node, parameters: resolved }, description, path)
			: []),
	];
}

function credentialIssues(
	credentials: unknown,
	node: INode,
	description: INodeTypeDescription,
	path: JsonPath,
	deps: WorkflowJsonValidationDeps,
): WorkflowJsonIssue[] {
	if (!isRecord(credentials)) return [];
	const activeTypes = NodeHelpers.getActiveCredentialTypes(node, description);
	return Object.entries(credentials).flatMap(([credentialType, details]) => {
		const credentialPath = [...path, credentialType];
		return [
			...(activeTypes && !activeTypes.has(credentialType)
				? [
						warning(
							credentialPath,
							text('workflowJsonPanel.validation.credentialNotUsed', { type: credentialType }),
						),
					]
				: []),
			...(isRecord(details) &&
			isString(details.id) &&
			!deps.credentialExists(details.id, credentialType)
				? [
						warning(
							[...credentialPath, 'id'],
							text('workflowJsonPanel.validation.credentialNotFound', {
								type: credentialType,
								id: details.id,
							}),
						),
					]
				: []),
		];
	});
}

function nodeTypeIssues(
	node: Record<string, unknown>,
	at: JsonPath,
	deps: WorkflowJsonValidationDeps,
	pinnedNodeNames: Set<string>,
	existing: INode | undefined,
): WorkflowJsonIssue[] {
	const { type, typeVersion } = node;
	if (!isString(type) || type.trim() === '') return [];
	// Apply does not touch a node that keeps its type and version, so a problem there must not block other edits
	const unchanged = existing?.typeVersion === typeVersion ? existing : undefined;
	const issue = unchanged ? warning : error;

	// Credential-only types have no versions of their own, but getNodeType still finds them
	const versions = [...deps.getNodeVersions(type)].sort((a, b) => a - b);
	if (versions.length === 0 && deps.getNodeType(type) === null) {
		return isCommunityPackageName(type)
			? [
					warning(
						[...at, 'type'],
						text('workflowJsonPanel.validation.communityTypeNotInstalled', { type }),
					),
				]
			: [issue([...at, 'type'], text('workflowJsonPanel.validation.typeNotInstalled', { type }))];
	}
	if (typeof typeVersion !== 'number') return [];

	const description = deps.getNodeType(type, typeVersion);
	if (!description) {
		return [
			issue(
				[...at, 'typeVersion'],
				versions.length > 0
					? text('workflowJsonPanel.validation.versionNotFound', {
							type,
							version: typeVersion,
							versions: versions.join(', '),
						})
					: text('workflowJsonPanel.validation.versionNotFoundNoList', {
							type,
							version: typeVersion,
						}),
			),
		];
	}

	const parameters = node.parameters ?? {};
	if (!isRecord(parameters)) return [];
	if (!isNodeParameters(parameters)) {
		return Object.entries(parameters)
			.filter(([, value]) => !isValidNodeParameterValueType(value))
			.map(([key]) =>
				error(
					[...at, 'parameters', key],
					text('workflowJsonPanel.validation.parameterValueInvalid', { key }),
				),
			);
	}

	const helperNode: INode = {
		id: isString(node.id) ? node.id : '',
		name: isString(node.name) ? node.name : '',
		type,
		typeVersion,
		position: [0, 0],
		disabled: node.disabled === true,
		parameters,
	};
	return [
		...parameterIssues(
			helperNode,
			description,
			[...at, 'parameters'],
			pinnedNodeNames,
			unchanged?.parameters,
		),
		...credentialIssues(node.credentials, helperNode, description, [...at, 'credentials'], deps),
	];
}

function nodeIssues(
	node: unknown,
	at: JsonPath,
	deps: WorkflowJsonValidationDeps,
	pinnedNodeNames: Set<string>,
): WorkflowJsonIssue[] {
	if (!isRecord(node)) return [error(at, text('workflowJsonPanel.validation.nodeNotAnObject'))];
	const current = isString(node.id) && node.id !== '' ? deps.getCurrentNode?.(node.id) : undefined;
	// Apply replaces a node whose type changes, so that node counts as new
	const existing = current?.type === node.type ? current : undefined;
	return [
		...nodeShapeIssues(node, at, existing),
		...nodeTypeIssues(node, at, deps, pinnedNodeNames, existing),
	];
}

function repeatedValues(values: Array<string | undefined>): Set<string> {
	const counts = countBy(values.filter(isString));
	return new Set(Object.keys(counts).filter((value) => counts[value] > 1));
}

function duplicateIssues(nodes: unknown[]): WorkflowJsonIssue[] {
	const names = nodes.map((node) =>
		isRecord(node) && isString(node.name) ? node.name : undefined,
	);
	const ids = nodes.map((node) =>
		isRecord(node) && isString(node.id) && node.id !== '' ? node.id : undefined,
	);
	const repeatedNames = repeatedValues(names);
	const repeatedIds = repeatedValues(ids);
	return nodes.flatMap((_, index) => {
		const name = names[index];
		const id = ids[index];
		return [
			...(name !== undefined && repeatedNames.has(name)
				? [
						error(
							['nodes', index, 'name'],
							text('workflowJsonPanel.validation.duplicateName', { name }),
						),
					]
				: []),
			...(id !== undefined && repeatedIds.has(id)
				? [error(['nodes', index, 'id'], text('workflowJsonPanel.validation.duplicateId', { id }))]
				: []),
		];
	});
}

function connectionTargetIssues(
	connection: unknown,
	path: JsonPath,
	resolve: NodeNameResolver,
): WorkflowJsonIssue[] {
	if (!isRecord(connection)) {
		return [error(path, text('workflowJsonPanel.validation.connectionNotAnObject'))];
	}
	const { node, type } = connection;
	return [
		...requiredFieldIssues(
			connection,
			'node',
			path,
			isString,
			text('workflowJsonPanel.validation.expectedString', { key: 'node' }),
		),
		...(isString(node) ? referenceIssues(node, [...path, 'node'], resolve) : []),
		...requiredFieldIssues(
			connection,
			'type',
			path,
			isNodeConnectionType,
			text('workflowJsonPanel.validation.connectionTypeUnknown', {
				type: isString(type) ? type : JSON.stringify(type),
			}),
		),
		...requiredFieldIssues(
			connection,
			'index',
			path,
			isInputIndex,
			text('workflowJsonPanel.validation.connectionIndexInvalid'),
		),
	];
}

function outputIssues(
	type: string,
	outputs: unknown,
	path: JsonPath,
	resolve: NodeNameResolver,
): WorkflowJsonIssue[] {
	if (!isNodeConnectionType(type)) {
		return [error(path, text('workflowJsonPanel.validation.connectionTypeUnknown', { type }))];
	}
	if (!Array.isArray(outputs)) {
		return [error(path, text('workflowJsonPanel.validation.expectedArray', { key: type }))];
	}
	const outputList: unknown[] = outputs;
	return outputList.flatMap((targets, outputIndex) => {
		const outputPath = [...path, outputIndex];
		if (targets === null) return [];
		if (!Array.isArray(targets)) {
			return [error(outputPath, text('workflowJsonPanel.validation.outputInvalid'))];
		}
		const targetList: unknown[] = targets;
		return targetList.flatMap((connection, index) =>
			connectionTargetIssues(connection, [...outputPath, index], resolve),
		);
	});
}

function connectionIssues(
	connections: Record<string, unknown>,
	resolve: NodeNameResolver,
): WorkflowJsonIssue[] {
	return Object.entries(connections).flatMap(([source, outputsByType]) => {
		const path: JsonPath = ['connections', source];
		return [
			...referenceIssues(source, path, resolve),
			...(isRecord(outputsByType)
				? Object.entries(outputsByType).flatMap(([type, outputs]) =>
						outputIssues(type, outputs, [...path, type], resolve),
					)
				: [error(path, text('workflowJsonPanel.validation.expectedObject', { key: source }))]),
		];
	});
}

function pinnedItemIssues(item: unknown, path: JsonPath): WorkflowJsonIssue[] {
	if (!isRecord(item)) return [error(path, text('workflowJsonPanel.validation.itemNotAnObject'))];
	return optionalFieldIssues(
		item,
		'json',
		path,
		isRecord,
		text('workflowJsonPanel.validation.expectedObject', { key: 'json' }),
	);
}

function pinDataIssues(pinData: unknown, resolve: NodeNameResolver): WorkflowJsonIssue[] {
	if (pinData === undefined) return [];
	if (!isRecord(pinData)) {
		return [
			error(['pinData'], text('workflowJsonPanel.validation.expectedObject', { key: 'pinData' })),
		];
	}
	return Object.entries(pinData).flatMap(([name, items]) => {
		const path: JsonPath = ['pinData', name];
		const itemIssues = Array.isArray(items)
			? items.flatMap((item: unknown, index: number) => pinnedItemIssues(item, [...path, index]))
			: [error(path, text('workflowJsonPanel.validation.pinDataNotArray'))];
		return [...referenceIssues(name, path, resolve), ...itemIssues];
	});
}

function settingsIssues(settings: unknown): WorkflowJsonIssue[] {
	if (settings === undefined) return [];
	if (!isRecord(settings)) {
		return [
			error(['settings'], text('workflowJsonPanel.validation.expectedObject', { key: 'settings' })),
		];
	}
	return optionalFieldIssues(
		settings,
		'executionOrder',
		['settings'],
		(value) => value === 'v0' || value === 'v1',
		text('workflowJsonPanel.validation.executionOrderInvalid'),
	);
}

const nodeIdentities = (nodes: unknown[]): NodeIdentity[] =>
	nodes.flatMap((node) =>
		isRecord(node) && isString(node.name)
			? [{ id: isString(node.id) && node.id !== '' ? node.id : undefined, name: node.name }]
			: [],
	);

/**
 * Checks the workflow JSON of the JSON panel. Errors block Apply. Warnings describe what Apply
 * changes or what the canvas will show, but Apply still works.
 */
export function validateWorkflowJson(
	json: unknown,
	deps: WorkflowJsonValidationDeps,
	context: WorkflowJsonValidationContext,
): WorkflowJsonIssue[] {
	if (!isRecord(json)) return [error([], text('workflowJsonPanel.validation.notAnObject'))];

	const nodes: unknown[] = Array.isArray(json.nodes) ? json.nodes : [];
	const resolve = createNodeNameResolver(nodeIdentities(nodes), context.baseNodes);
	const pinnedNodeNames = new Set(
		isRecord(json.pinData)
			? Object.keys(json.pinData).flatMap((name) => resolve(name)?.name ?? [])
			: [],
	);

	const issues = [
		...workflowShapeIssues(json),
		...nodes.flatMap((node, index) => nodeIssues(node, ['nodes', index], deps, pinnedNodeNames)),
		...duplicateIssues(nodes),
		...(isRecord(json.connections) ? connectionIssues(json.connections, resolve) : []),
		...pinDataIssues(json.pinData, resolve),
		...settingsIssues(json.settings),
	];
	return uniqBy(issues, (issue) => JSON.stringify([issue.severity, issue.path, issue.message]));
}
