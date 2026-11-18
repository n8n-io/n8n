import {
	autocompletion,
	pickedCompletion,
	startCompletion,
	type Completion,
	type CompletionResult,
	type CompletionSource,
} from '@codemirror/autocomplete';
import { jsonLanguage } from '@codemirror/lang-json';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Extension } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import uniqBy from 'lodash/uniqBy';
import {
	NodeConnectionTypes,
	NodeHelpers,
	isINodeProperties,
	isINodePropertyCollection,
	isINodePropertyOptions,
	isNodeConnectionType,
	isValidNodeParameterValueType,
	nodeConnectionTypes,
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type INodeTypeDescription,
	type IWorkflowSettings,
	type NodeParameterValueType,
	type OnError,
	type WorkflowSettings,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { JsonPath, WorkflowJson } from './workflowJson.types';
import {
	findProperty,
	nodePath,
	pathToValueNode,
	propertyValue,
	readField,
} from './workflowJsonPaths';

export type WorkflowJsonCompletionDeps = {
	getNodeType: (type: string, version?: number) => INodeTypeDescription | null;
	getNodeVersions: (type: string) => number[];
	/** Installed node types, the latest version of each. */
	getNodeTypes: () => INodeTypeDescription[];
	getCredentialsByType: (credentialType: string) => Array<{ id: string; name: string }>;
};

/** Where the completion goes, read from the syntax tree around the cursor. */
type Slot = {
	kind: 'key' | 'value';
	/** For a key: the path of the object that gets the key. For a value: the path of the value. */
	path: JsonPath;
	/** The typed text without quotes. Completions filter by it and replace it. */
	from: number;
	to: number;
	text: string;
	quoted: boolean;
	closed: boolean;
	/** The key already has a colon after it, so only the key text changes. */
	keyOnly: boolean;
	/** Keys that the object has, without the key that is being typed. */
	present: Set<string>;
	/** Object members and array items can miss the comma before them. */
	commaBefore: boolean;
};

type Token = Pick<Slot, 'from' | 'to' | 'text' | 'quoted' | 'closed'> & {
	start: number;
	end: number;
};

type Edit = { from: number; to: number; insert: string };

type Candidate = {
	label: string;
	/** For a key: the value of the new member. For a value: the value itself. */
	value: unknown;
	detail?: string;
	info?: string;
	/** Open the list again after the member is inserted, to choose its value. */
	pick?: boolean;
	/** More edits in the same transaction, computed when the completion is applied. */
	extra?: (state: EditorState) => Edit[];
};

/**
 * `prefiltered` candidates are already chosen for the typed text. CodeMirror does not filter them:
 * it asks the source again after each typed character.
 */
type Candidates = { items: Candidate[]; prefiltered?: boolean };

type ApplyFunction = Exclude<Completion['apply'], string | undefined>;

const NONE: Candidates = { items: [] };
const VALUE_TOKENS = new Set(['String', 'Number', 'True', 'False', 'Null']);
const VALUE_NODES = [...VALUE_TOKENS, 'Object', 'Array'];
const BARE_TEXT = /^[\w$@.+-]*$/;
const QUOTED_TEXT = /^[^"\\]*$/;
const JSON_STRING = /^"(?:[^"\\]|\\.)*"$/;
/** What can follow the closing quote of a string: white space, a separator or another quote. */
const AFTER_STRING = /^(?:$|[\s,:}\]"])/;
const UI_ONLY_PARAMETER_TYPES = new Set([
	'notice',
	'callout',
	'button',
	'curlImport',
	'hidden',
	'credentials',
]);

const BOOLEANS: Candidate[] = [
	{ label: 'true', value: true },
	{ label: 'false', value: false },
];

const BOOLEAN_NODE_FIELDS = new Set<string>([
	'disabled',
	'notesInFlow',
	'retryOnFail',
	'alwaysOutputData',
	'executeOnce',
] satisfies Array<keyof INode>);

const ON_ERROR_VALUES: OnError[] = ['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'];

type Member<Key extends string> = Candidate & { label: Key };

const WORKFLOW_MEMBERS: Array<Member<keyof WorkflowJson>> = [
	{ label: 'name', value: '' },
	{ label: 'nodes', value: [] },
	{ label: 'connections', value: {}, pick: true },
	{ label: 'pinData', value: {}, pick: true },
	{ label: 'settings', value: {}, pick: true },
];

const SETTINGS_MEMBERS: Array<Member<keyof IWorkflowSettings>> = [
	{ label: 'executionOrder', value: 'v1', pick: true },
	{ label: 'saveDataErrorExecution', value: 'all', pick: true },
	{ label: 'saveDataSuccessExecution', value: 'all', pick: true },
	{ label: 'saveManualExecutions', value: true, pick: true },
	{ label: 'saveExecutionProgress', value: true, pick: true },
	{ label: 'timezone', value: 'DEFAULT', pick: true },
	{ label: 'errorWorkflow', value: '' },
	{ label: 'callerPolicy', value: 'workflowsFromSameOwner', pick: true },
	{ label: 'callerIds', value: '' },
	{ label: 'executionTimeout', value: 3600 },
];

const SAVE_DATA_VALUES: WorkflowSettings.SaveDataExecution[] = ['all', 'none'];
const CALLER_POLICY_VALUES: WorkflowSettings.CallerPolicy[] = [
	'any',
	'none',
	'workflowsFromAList',
	'workflowsFromSameOwner',
];

function settingValues(key: string): Array<string | boolean> {
	switch (key) {
		case 'executionOrder':
			return ['v0', 'v1'] satisfies Array<IWorkflowSettings['executionOrder']>;
		case 'saveDataErrorExecution':
		case 'saveDataSuccessExecution':
			return SAVE_DATA_VALUES;
		case 'saveManualExecutions':
		case 'saveExecutionProgress':
			return [true, false];
		case 'callerPolicy':
			return CALLER_POLICY_VALUES;
		case 'timezone':
			return ['DEFAULT', ...Intl.supportedValuesOf('timeZone')];
		default:
			return [];
	}
}

const plainText = (html?: string) => html?.replace(/<[^>]*>/g, '');

/** Single-line JSON with a space after each colon and comma. */
const inlineJson = (value: unknown) =>
	value === undefined ? 'null' : JSON.stringify(value, null, 1).replace(/\n\s*/g, ' ');

const latestVersion = (description: INodeTypeDescription) =>
	Array.isArray(description.version) ? Math.max(...description.version) : description.version;

const defaultVersion = (description: INodeTypeDescription) =>
	description.defaultVersion ?? latestVersion(description);

const defaultLabel = () => useI18n().baseText('workflowJsonPanel.completion.default');

function keyText(state: EditorState, keyNode: SyntaxNode): string {
	const raw = state.sliceDoc(keyNode.from, keyNode.to);
	try {
		const key: unknown = JSON.parse(raw);
		return typeof key === 'string' ? key : raw;
	} catch {
		return raw.slice(1, -1);
	}
}

function valueChildren(node: SyntaxNode): SyntaxNode[] {
	return VALUE_NODES.flatMap((name) => node.getChildren(name)).sort((a, b) => a.from - b.from);
}

type Entry = { key: SyntaxNode; value: SyntaxNode | null };

/**
 * The members in a Property node. A new key on the line above another member has no comma yet,
 * so lezer reads the new key, the next key as an error node and the next value as one Property.
 */
function propertyEntries(state: EditorState, property: SyntaxNode): Entry[] {
	const key = property.getChild('PropertyName');
	if (!key) return [];
	const value = propertyValue(property);
	const next = key.nextSibling;
	const swallowed =
		next?.type.isError &&
		state.sliceDoc(key.to, next.from).trim() === '' &&
		JSON_STRING.test(state.sliceDoc(next.from, next.to));
	return swallowed && next
		? [
				{ key, value: null },
				{ key: next, value },
			]
		: [{ key, value }];
}

const objectEntries = (state: EditorState, object: SyntaxNode) =>
	object.getChildren('Property').flatMap((property) => propertyEntries(state, property));

/** Reads the valid part of a value that is being edited: members without a value are left out. */
function readLenient(state: EditorState, node: SyntaxNode): unknown {
	if (node.name === 'Object') {
		return Object.fromEntries(
			objectEntries(state, node).flatMap(
				({ key, value }): Array<[string, unknown]> =>
					value ? [[keyText(state, key), readLenient(state, value)]] : [],
			),
		);
	}
	if (node.name === 'Array') return valueChildren(node).map((item) => readLenient(state, item));
	try {
		return JSON.parse(state.sliceDoc(node.from, node.to));
	} catch {
		return undefined;
	}
}

function nextChar(state: EditorState, pos: number): string {
	let at = pos;
	while (at < state.doc.length && /\s/.test(state.sliceDoc(at, at + 1))) at++;
	return state.sliceDoc(at, at + 1);
}

/** The position after the last character before `pos` that is not white space. */
function previousEnd(state: EditorState, pos: number): number {
	let at = pos;
	while (at > 0 && /\s/.test(state.sliceDoc(at - 1, at))) at--;
	return at;
}

function hasColonBefore(state: EditorState, property: SyntaxNode, pos: number): boolean {
	const key = property.getChild('PropertyName');
	return key !== null && state.sliceDoc(key.to, pos).trim() === ':';
}

function readToken(state: EditorState, node: SyntaxNode, pos: number): Token | null {
	const raw = state.sliceDoc(node.from, node.to);
	const quoted = raw.startsWith('"');
	const endsWithQuote = quoted && raw.length > 1 && raw.endsWith('"');
	// Lezer ends a string without its closing quote at the opening quote of the next string on the
	// line. Then the token stops at the cursor, so a completion keeps that quote.
	const borrowedQuote = endsWithQuote && !AFTER_STRING.test(state.sliceDoc(node.to, node.to + 1));
	const closed = endsWithQuote && !borrowedQuote;
	const from = quoted ? node.from + 1 : node.from;
	const to = closed ? node.to - 1 : borrowedQuote ? Math.min(pos, node.to - 1) : node.to;
	if (pos < from || pos > to || (!quoted && (raw === '' || !BARE_TEXT.test(raw)))) return null;
	return {
		start: node.from,
		end: borrowedQuote ? to : node.to,
		from,
		to,
		text: state.sliceDoc(from, to),
		quoted,
		closed,
	};
}

const emptyToken = (pos: number): Token => ({
	start: pos,
	end: pos,
	from: pos,
	to: pos,
	text: '',
	quoted: false,
	closed: false,
});

function keySlot(
	state: EditorState,
	object: SyntaxNode,
	token: Token,
	editedKey?: number,
): Slot | null {
	if (object.name !== 'Object') return null;
	const present = objectEntries(state, object)
		.filter(({ key }) => key.from !== editedKey)
		.map(({ key }) => keyText(state, key));
	return {
		...token,
		kind: 'key',
		path: nodePath(state, object),
		keyOnly: nextChar(state, token.end) === ':',
		present: new Set(present),
		commaBefore: true,
	};
}

function valueSlot(state: EditorState, container: SyntaxNode, token: Token): Slot {
	const inArray = container.name === 'Array';
	const index = valueChildren(container).filter((item) => item.from < token.start).length;
	return {
		...token,
		kind: 'value',
		path: inArray ? [...nodePath(state, container), index] : nodePath(state, container),
		keyOnly: false,
		present: new Set(),
		commaBefore: inArray,
	};
}

function findSlot(state: EditorState, pos: number, explicit: boolean): Slot | null {
	const node = syntaxTree(state).resolveInner(pos, -1);
	const parent = node.parent;
	if (!parent) return null;

	if (node.name === 'PropertyName') {
		const token = readToken(state, node, pos);
		return token && parent.parent ? keySlot(state, parent.parent, token, node.from) : null;
	}

	if (VALUE_TOKENS.has(node.name) || node.type.isError) {
		const token = readToken(state, node, pos);
		if (!token) return null;
		if (parent.name === 'Object') return node.type.isError ? keySlot(state, parent, token) : null;
		const isValue =
			parent.name === 'Array' ||
			(parent.name === 'Property' && hasColonBefore(state, parent, node.from));
		return isValue ? valueSlot(state, parent, token) : null;
	}

	// Without typed text, complete only on request (Ctrl+Space)
	if (!explicit) return null;
	const empty = emptyToken(pos);
	switch (node.name) {
		case 'Property':
			return !propertyValue(node) && hasColonBefore(state, node, pos)
				? valueSlot(state, node, empty)
				: null;
		case 'Object':
			return keySlot(state, node, empty);
		case '{':
			return keySlot(state, parent, empty);
		case 'Array':
			return valueSlot(state, node, empty);
		case '[':
			return valueSlot(state, parent, empty);
		default:
			return null;
	}
}

type NodeContext = {
	description: INodeTypeDescription | null;
	type?: string;
	typeVersion: number;
	parameters: INodeParameters;
};

function toNodeParameters(value: unknown): INodeParameters {
	if (!isRecord(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter((entry): entry is [string, NodeParameterValueType] =>
			isValidNodeParameterValueType(entry[1]),
		),
	);
}

function readNodeContext(
	state: EditorState,
	deps: WorkflowJsonCompletionDeps,
	index: number,
): NodeContext | null {
	const object = pathToValueNode(state, ['nodes', index]);
	if (object?.name !== 'Object') return null;

	const typeField = readField(state, object, 'type');
	const versionField = readField(state, object, 'typeVersion');
	const type = typeof typeField === 'string' ? typeField : undefined;
	const exact =
		type && typeof versionField === 'number' ? deps.getNodeType(type, versionField) : null;
	// An unknown version still gets completions from the latest version of the type
	const description = exact ?? (type ? deps.getNodeType(type) : null);
	const parametersProperty = findProperty(state, object, 'parameters');
	const parametersNode = parametersProperty ? propertyValue(parametersProperty) : null;

	return {
		description,
		type,
		typeVersion:
			exact && typeof versionField === 'number'
				? versionField
				: description
					? latestVersion(description)
					: 1,
		parameters: toNodeParameters(parametersNode ? readLenient(state, parametersNode) : {}),
	};
}

function workflowNodeNames(state: EditorState, deps: WorkflowJsonCompletionDeps): Candidate[] {
	const nodes = pathToValueNode(state, ['nodes']);
	if (nodes?.name !== 'Array') return [];
	const names = nodes.getChildren('Object').flatMap((object) => {
		const name = readField(state, object, 'name');
		const type = readField(state, object, 'type');
		if (typeof name !== 'string') return [];
		const detail = typeof type === 'string' ? (deps.getNodeType(type)?.displayName ?? type) : '';
		return [{ label: name, value: name, detail }];
	});
	return uniqBy(names, 'label');
}

function nodeMembers(node: NodeContext): Array<Member<keyof INode>> {
	return [
		{ label: 'name', value: '' },
		{ label: 'type', value: '', pick: true },
		{
			label: 'typeVersion',
			value: node.description ? defaultVersion(node.description) : 1,
			pick: true,
		},
		{ label: 'position', value: [0, 0] },
		{ label: 'id', value: uuid() },
		{ label: 'parameters', value: {}, pick: true },
		{ label: 'credentials', value: {}, pick: true },
		{ label: 'disabled', value: true, pick: true },
		{ label: 'notes', value: '' },
		{ label: 'notesInFlow', value: true, pick: true },
		{ label: 'retryOnFail', value: true, pick: true },
		{ label: 'maxTries', value: 3 },
		{ label: 'waitBetweenTries', value: 1000 },
		{ label: 'alwaysOutputData', value: true, pick: true },
		{ label: 'executeOnce', value: true, pick: true },
		{ label: 'onError', value: 'continueRegularOutput', pick: true },
		{ label: 'webhookId', value: uuid() },
	];
}

function nodeTypeScore(
	{ name, displayName }: INodeTypeDescription,
	query: string,
	words: string[],
): number {
	if (!query) return 1;
	const fullName = name.toLowerCase();
	const shortName = fullName.slice(fullName.lastIndexOf('.') + 1);
	if (shortName.startsWith(query)) return 4;
	if (fullName.startsWith(query)) return 3;
	if (fullName.includes(query)) return 2;
	const displayWords = displayName.toLowerCase().split(/[^\p{L}\p{N}]+/u);
	return words.every((word) => displayWords.some((displayWord) => displayWord.startsWith(word)))
		? 1
		: 0;
}

/** A new type keeps the node valid: a `typeVersion` that the type does not have changes to its default. */
function syncTypeVersion(
	deps: WorkflowJsonCompletionDeps,
	nodeIndex: number,
	description: INodeTypeDescription,
) {
	return (state: EditorState): Edit[] => {
		const object = pathToValueNode(state, ['nodes', nodeIndex]);
		const property = object ? findProperty(state, object, 'typeVersion') : null;
		const value = property ? propertyValue(property) : null;
		if (!value) return [];
		const current = Number(state.sliceDoc(value.from, value.to));
		return deps.getNodeVersions(description.name).includes(current)
			? []
			: [{ from: value.from, to: value.to, insert: String(defaultVersion(description)) }];
	};
}

function nodeTypeCandidates(
	deps: WorkflowJsonCompletionDeps,
	text: string,
	nodeIndex: number,
): Candidate[] {
	const types = deps.getNodeTypes();
	const query = types.some((type) => type.name === text) ? '' : text.trim().toLowerCase();
	const words = query.split(/\s+/).filter(Boolean);
	return types
		.map((type) => ({ type, score: nodeTypeScore(type, query, words) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.type.displayName.localeCompare(b.type.displayName))
		.map(({ type }) => ({
			label: type.name,
			value: type.name,
			detail: type.displayName,
			info: plainText(type.description),
			extra: syncTypeVersion(deps, nodeIndex, type),
		}));
}

function versionCandidates(deps: WorkflowJsonCompletionDeps, node: NodeContext): Candidate[] {
	if (!node.type) return [];
	const fallback = node.description ? defaultVersion(node.description) : undefined;
	return [...deps.getNodeVersions(node.type)]
		.sort((a, b) => b - a)
		.map((version) => ({
			label: String(version),
			value: version,
			detail: version === fallback ? defaultLabel() : undefined,
		}));
}

function credentialTypes(node: NodeContext): string[] {
	const { description } = node;
	if (!description) return [];
	const active = NodeHelpers.getActiveCredentialTypes(
		{
			id: '',
			name: '',
			type: description.name,
			typeVersion: node.typeVersion,
			position: [0, 0],
			parameters: node.parameters,
		},
		description,
	);
	return active ? [...active] : (description.credentials ?? []).map(({ name }) => name);
}

function credentialCandidates(
	deps: WorkflowJsonCompletionDeps,
	node: NodeContext,
	rest: JsonPath,
	slot: Slot,
): Candidate[] {
	if (rest.length === 0) {
		if (slot.kind !== 'key') return [];
		// One entry for each credential, so a type key also gets a credential that exists
		return credentialTypes(node).flatMap((type) => {
			const credentials = deps.getCredentialsByType(type);
			return credentials.length > 0
				? credentials.map(({ id, name }) => ({ label: type, value: { id, name }, detail: name }))
				: [{ label: type, value: { id: '', name: '' } }];
		});
	}

	const credentials = deps.getCredentialsByType(String(rest[0]));
	if (rest.length === 1) {
		return slot.kind === 'key'
			? [
					{ label: 'id', value: '', pick: true },
					{ label: 'name', value: '', pick: true },
				]
			: credentials.map(({ id, name }) => ({ label: name, value: { id, name }, detail: id }));
	}
	if (rest.length !== 2 || slot.kind !== 'value') return [];
	if (rest[1] === 'id') {
		return credentials.map(({ id, name }) => ({ label: id, value: id, detail: name }));
	}
	if (rest[1] === 'name') {
		return credentials.map(({ id, name }) => ({ label: name, value: name, detail: id }));
	}
	return [];
}

type ParameterContext = {
	description: INodeTypeDescription;
	node: Pick<INode, 'typeVersion'>;
	/** The parameters with defaults, to evaluate display options like the node details view. */
	values: INodeParameters;
};

/** What a JSON value inside `parameters` holds. `at` is its lodash path inside `parameters`. */
type Level =
	| { kind: 'params'; properties: INodeProperties[]; at: string }
	| { kind: 'value'; property: INodeProperties; holder: string; item: boolean }
	| { kind: 'groups'; property: INodeProperties; at: string }
	| { kind: 'groupItems'; group: INodePropertyCollection; at: string }
	| { kind: 'list'; property: INodeProperties; at: string; holder: string }
	| { kind: 'locator'; property: INodeProperties }
	| { kind: 'locatorField'; property: INodeProperties; field: string };

const joinPath = (at: string, segment: string | number) =>
	typeof segment === 'number' ? `${at}[${segment}]` : at ? `${at}.${segment}` : segment;

const staticOptions = (property: INodeProperties) =>
	(property.options ?? []).filter(isINodePropertyOptions);

const isMultiple = (property: INodeProperties) => property.typeOptions?.multipleValues === true;

function isShown(
	context: ParameterContext,
	parameter: INodeProperties | INodePropertyOptions,
	at: string,
): boolean {
	return NodeHelpers.displayParameterPath(
		{ parameters: context.values },
		parameter,
		at ? `parameters.${at}` : 'parameters',
		context.node,
		context.description,
	);
}

function resolveParameters(
	description: INodeTypeDescription,
	node: Pick<INode, 'typeVersion'>,
	parameters: INodeParameters,
): INodeParameters {
	try {
		return (
			NodeHelpers.getNodeParameters(
				description.properties,
				parameters,
				true,
				true,
				node,
				description,
			) ?? parameters
		);
	} catch {
		// Malformed values (a fixedCollection group that is not an array) make it throw
		return parameters;
	}
}

function open(level: Extract<Level, { kind: 'value' }>): Level | undefined {
	const { property, holder, item } = level;
	if (item) return undefined;
	const at = joinPath(holder, property.name);
	if (property.type === 'fixedCollection') return { kind: 'groups', property, at };
	if (isMultiple(property) || property.type === 'multiOptions') {
		return { kind: 'list', property, at, holder };
	}
	if (property.type === 'collection') {
		return { kind: 'params', properties: (property.options ?? []).filter(isINodeProperties), at };
	}
	if (property.type === 'resourceLocator') return { kind: 'locator', property };
	return undefined;
}

function descend(
	context: ParameterContext,
	level: Level,
	segment: string | number,
): Level | undefined {
	switch (level.kind) {
		case 'params': {
			if (typeof segment !== 'string') return undefined;
			// A name can repeat with other display options: take the variant that is shown
			const variants = level.properties.filter((property) => property.name === segment);
			const property =
				variants.find((variant) => isShown(context, variant, level.at)) ?? variants.at(0);
			return property && { kind: 'value', property, holder: level.at, item: false };
		}
		case 'value': {
			const opened = open(level);
			return opened && descend(context, opened, segment);
		}
		case 'groups': {
			if (typeof segment !== 'string') return undefined;
			const group = (level.property.options ?? [])
				.filter(isINodePropertyCollection)
				.find(({ name }) => name === segment);
			if (!group) return undefined;
			const at = joinPath(level.at, segment);
			return isMultiple(level.property)
				? { kind: 'groupItems', group, at }
				: { kind: 'params', properties: group.values, at };
		}
		case 'groupItems':
			return typeof segment === 'number'
				? { kind: 'params', properties: level.group.values, at: joinPath(level.at, segment) }
				: undefined;
		case 'list': {
			if (typeof segment !== 'number') return undefined;
			const { property } = level;
			return property.type === 'collection'
				? {
						kind: 'params',
						properties: (property.options ?? []).filter(isINodeProperties),
						at: joinPath(level.at, segment),
					}
				: { kind: 'value', property, holder: level.holder, item: true };
		}
		case 'locator':
			return typeof segment === 'string'
				? { kind: 'locatorField', property: level.property, field: segment }
				: undefined;
		default:
			return undefined;
	}
}

function parameterDefault(property: INodeProperties): unknown {
	if (property.type === 'resourceLocator' && isRecord(property.default)) {
		return { __rl: true, ...property.default };
	}
	return property.default;
}

function parameterMember(property: INodeProperties): Candidate {
	const hasChoices =
		property.type === 'boolean' ||
		((property.type === 'options' || property.type === 'multiOptions') &&
			staticOptions(property).length > 0);
	return {
		label: property.name,
		value: parameterDefault(property),
		detail: `${property.displayName} (${property.type})`,
		info: plainText(property.description),
		pick: hasChoices || property.type === 'collection' || property.type === 'fixedCollection',
	};
}

function locatorMembers(property: INodeProperties): Candidate[] {
	const modes = property.modes ?? [];
	return [
		{ label: '__rl', value: true },
		{ label: 'mode', value: modes.at(0)?.name ?? 'id', pick: modes.length > 0 },
		{ label: 'value', value: '' },
		{ label: 'cachedResultName', value: '' },
		{ label: 'cachedResultUrl', value: '' },
	];
}

function parameterKeys(context: ParameterContext, level: Level): Candidate[] {
	const container = level.kind === 'value' ? open(level) : level;
	switch (container?.kind) {
		case 'params': {
			const shown = container.properties.filter(
				(property) =>
					!UI_ONLY_PARAMETER_TYPES.has(property.type) && isShown(context, property, container.at),
			);
			return uniqBy(shown, 'name').map(parameterMember);
		}
		case 'groups': {
			const multiple = isMultiple(container.property);
			return (container.property.options ?? [])
				.filter(isINodePropertyCollection)
				.map(({ name, displayName }) => ({
					label: name,
					value: multiple ? [{}] : {},
					detail: displayName,
					pick: true,
				}));
		}
		case 'locator':
			return locatorMembers(container.property);
		default:
			return [];
	}
}

function defaultHint(value: unknown): Candidate[] {
	const label =
		typeof value === 'number'
			? String(value)
			: typeof value === 'string' && !value.includes('\n')
				? value
				: '';
	return label ? [{ label, value, detail: defaultLabel() }] : [];
}

function parameterValues(context: ParameterContext, level: Level, text: string): Candidates {
	if (level.kind === 'locatorField') {
		if (level.field === 'mode') {
			return {
				items: (level.property.modes ?? []).map(({ name, displayName }) => ({
					label: name,
					value: name,
					detail: displayName,
				})),
			};
		}
		return level.field === '__rl' ? { items: [{ label: 'true', value: true }] } : NONE;
	}
	if (level.kind !== 'value') return NONE;

	const { property, holder, item } = level;
	if (property.type === 'boolean') return { items: BOOLEANS };
	if (property.type === 'options' || property.type === 'multiOptions') {
		const wrap = property.type === 'multiOptions' && !item;
		return {
			items: staticOptions(property)
				.filter((option) => isShown(context, option, holder))
				.map((option) => ({
					label: String(option.value),
					value: wrap ? [option.value] : option.value,
					detail: option.name,
					info: plainText(option.description),
				})),
		};
	}
	// Enter accepts an open list, so a default offered for typed text would replace that text
	return item || text !== '' ? NONE : { items: defaultHint(property.default), prefiltered: true };
}

function parameterCandidates(
	node: NodeContext,
	description: INodeTypeDescription,
	rest: JsonPath,
	slot: Slot,
): Candidates {
	const typeVersion = { typeVersion: node.typeVersion };
	const context: ParameterContext = {
		description,
		node: typeVersion,
		values: resolveParameters(description, typeVersion, node.parameters),
	};
	const level = rest.reduce<Level | undefined>(
		(current, segment) => current && descend(context, current, segment),
		{ kind: 'params', properties: description.properties, at: '' },
	);
	if (!level) return NONE;
	return slot.kind === 'key'
		? { items: parameterKeys(context, level) }
		: parameterValues(context, level, slot.text);
}

function nodeCandidates(
	state: EditorState,
	slot: Slot,
	deps: WorkflowJsonCompletionDeps,
): Candidates {
	const [, index, field, ...rest] = slot.path;
	if (typeof index !== 'number') return NONE;
	const node = readNodeContext(state, deps, index);
	if (!node) return NONE;

	if (slot.path.length === 2) return slot.kind === 'key' ? { items: nodeMembers(node) } : NONE;
	if (field === 'parameters') {
		return node.description ? parameterCandidates(node, node.description, rest, slot) : NONE;
	}
	if (field === 'credentials') return { items: credentialCandidates(deps, node, rest, slot) };
	if (slot.path.length !== 3 || slot.kind !== 'value') return NONE;

	switch (field) {
		case 'type':
			return { items: nodeTypeCandidates(deps, slot.text, index), prefiltered: true };
		case 'typeVersion':
			return { items: versionCandidates(deps, node) };
		case 'onError':
			return { items: ON_ERROR_VALUES.map((value) => ({ label: value, value })) };
		default:
			return { items: BOOLEAN_NODE_FIELDS.has(String(field)) ? BOOLEANS : [] };
	}
}

function connectionCandidates(
	state: EditorState,
	slot: Slot,
	deps: WorkflowJsonCompletionDeps,
): Candidate[] {
	const { path, kind } = slot;
	if (path.length === 1 && kind === 'key') {
		return workflowNodeNames(state, deps).map((node) => ({
			...node,
			value: { [NodeConnectionTypes.Main]: [[]] },
			pick: true,
		}));
	}
	if (path.length === 2 && kind === 'key') {
		return nodeConnectionTypes.map((type) => ({ label: type, value: [[]], pick: true }));
	}

	const type = isNodeConnectionType(path[2]) ? path[2] : NodeConnectionTypes.Main;
	if (path.length === 5 && kind === 'value') {
		return workflowNodeNames(state, deps).map((node) => ({
			...node,
			value: { node: node.label, type, index: 0 },
		}));
	}
	if (path.length === 5 && kind === 'key') {
		return [
			{ label: 'node', value: '', pick: true },
			{ label: 'type', value: type, pick: true },
			{ label: 'index', value: 0 },
		];
	}
	if (path.length === 6 && kind === 'value' && path[5] === 'node') {
		return workflowNodeNames(state, deps);
	}
	if (path.length === 6 && kind === 'value' && path[5] === 'type') {
		return nodeConnectionTypes.map((connectionType) => ({
			label: connectionType,
			value: connectionType,
		}));
	}
	return [];
}

function candidatesFor(
	state: EditorState,
	slot: Slot,
	deps: WorkflowJsonCompletionDeps,
): Candidates {
	const { path, kind } = slot;
	if (path.length === 0) return kind === 'key' ? { items: WORKFLOW_MEMBERS } : NONE;

	switch (path[0]) {
		case 'nodes':
			return nodeCandidates(state, slot, deps);
		case 'connections':
			return { items: connectionCandidates(state, slot, deps) };
		case 'pinData':
			return path.length === 1 && kind === 'key'
				? {
						items: workflowNodeNames(state, deps).map((node) => ({
							...node,
							value: [{ json: {} }],
						})),
					}
				: NONE;
		case 'settings':
			if (path.length === 1 && kind === 'key') return { items: SETTINGS_MEMBERS };
			if (path.length === 2 && kind === 'value') {
				return {
					items: settingValues(String(path[1])).map((value) => ({ label: String(value), value })),
				};
			}
			return NONE;
		default:
			return NONE;
	}
}

/** The selection inside an inserted value: the default is selected, so typing replaces it. */
function valueSelection(text: string): [number, number] {
	const end = text.length;
	if (text.startsWith('"')) return [1, end - 1];
	if (text.startsWith('{') || text.startsWith('[')) {
		const empty = /""|\{\}|\[\]/.exec(text);
		return empty ? [empty.index + 1, empty.index + 1] : [end, end];
	}
	return [0, end];
}

function replaceWith(
	slot: Slot,
	text: string,
	options: {
		select?: [number, number];
		pick?: boolean;
		commas?: boolean;
		extra?: (state: EditorState) => Edit[];
	} = {},
): ApplyFunction {
	return (view, completion, from, to) => {
		const { state } = view;
		const start = slot.quoted && state.sliceDoc(from - 1, from) === '"' ? from - 1 : from;
		const end = slot.closed && state.sliceDoc(to, to + 1) === '"' ? to + 1 : to;
		const commas = options.commas ?? true;
		const before = previousEnd(state, start);
		const commaBefore =
			commas &&
			slot.commaBefore &&
			before > 0 &&
			!'{[,:'.includes(state.sliceDoc(before - 1, before));
		const after = nextChar(state, end);
		const commaAfter = commas && after !== '' && !'}],:'.includes(after);
		const insert = commaAfter ? `${text},` : text;

		const changes = state.changes([
			...(commaBefore ? [{ from: before, insert: ',' }] : []),
			{ from: start, to: end, insert },
			...(options.extra?.(state) ?? []),
		]);
		const insertStart = changes.mapPos(end, 1) - insert.length;
		const [anchor, head] = options.select ?? [text.length, text.length];
		view.dispatch({
			changes,
			selection: { anchor: insertStart + anchor, head: insertStart + head },
			scrollIntoView: true,
			userEvent: 'input.complete',
			annotations: pickedCompletion.of(completion),
		});
		if (options.pick) startCompletion(view);
	};
}

function toCompletion(slot: Slot, candidate: Candidate, rank: number): Completion {
	const { label, detail, info, pick, extra } = candidate;
	const completion = { label, detail, info, boost: -rank };
	if (slot.kind === 'value') {
		return { ...completion, apply: replaceWith(slot, inlineJson(candidate.value), { extra }) };
	}

	const key = JSON.stringify(label);
	if (slot.keyOnly) return { ...completion, apply: replaceWith(slot, key, { commas: false }) };

	const value = inlineJson(candidate.value);
	const offset = key.length + 2;
	const [anchor, head] = valueSelection(value);
	return {
		...completion,
		apply: replaceWith(slot, `${key}: ${value}`, {
			select: [offset + anchor, offset + head],
			pick,
		}),
	};
}

function toResult(slot: Slot, { items, prefiltered = false }: Candidates): CompletionResult | null {
	const candidates =
		slot.kind === 'key' ? items.filter(({ label }) => !slot.present.has(label)) : items;
	if (candidates.length === 0) return null;

	// A complete value lists every choice so it can be swapped. It comes first, so Enter keeps it.
	const current =
		slot.kind === 'value' ? candidates.find(({ label }) => label === slot.text) : undefined;
	const ordered = current
		? [current, ...candidates.filter((candidate) => candidate !== current)]
		: candidates;
	return {
		from: slot.from,
		to: slot.to,
		options: ordered.map((candidate, i) => toCompletion(slot, candidate, i / ordered.length)),
		...(prefiltered || current
			? { filter: false }
			: { validFor: slot.quoted ? QUOTED_TEXT : BARE_TEXT }),
	};
}

export function workflowJsonCompletionSource(deps: WorkflowJsonCompletionDeps): CompletionSource {
	return (context) => {
		const { state } = context;
		const { main } = state.selection;
		// CodeMirror completes at the start of a selection. A selected value is completed as a whole.
		const pos = context.pos === main.from ? main.to : context.pos;
		const slot = findSlot(state, pos, context.explicit);
		return slot ? toResult(slot, candidatesFor(state, slot, deps)) : null;
	};
}

export function workflowJsonAutocomplete(deps: WorkflowJsonCompletionDeps): Extension {
	return [
		jsonLanguage.data.of({ autocomplete: workflowJsonCompletionSource(deps) }),
		autocompletion({ icons: false, activateOnTyping: true }),
	];
}
