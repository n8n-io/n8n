import type { CustomNodeAuth } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import type {
	DeclarativeRestApiSettings,
	GenericValue,
	IDataObject,
	IDisplayOptions,
	INodeCredentialDescription,
	INodeProperties,
	INodePropertyOptions,
	INodePropertyRouting,
	INodeTypeDescription,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { StoredInput, StoredRequest } from './edit-classifier';
import {
	OPERATION_PARAMETER,
	PIN_ACTION_ID_PARAMETER,
	PIN_ACTION_NAME_PARAMETER,
	operationOptions,
	pinProperties,
	showFor,
} from './version-pin';

/**
 * Turns a custom node and its actions into a declarative node description.
 * `RoutingNode` runs the result with no extra code.
 *
 * `RoutingNode` evaluates every string that starts with `=` as an expression. Only this file
 * builds the expressions of the node. A stored value is a plain value: the generator throws
 * when a stored string contains `{{` or starts with `=`.
 */

export interface ActionVersionView {
	version: number;
	inputs: StoredInput[];
	request: StoredRequest;
}

/** `versions` are in ascending order. */
export interface ActionView {
	id: string;
	name: string;
	description?: string;
	versions: ActionVersionView[];
}

/** An action with the numbers of its versions, as `version-pin.ts` takes it. */
export interface ActionVersionsRef {
	id: string;
	name: string;
	description?: string;
	versions: number[];
}

export interface CustomNodeView {
	id: string;
	displayName: string;
	description?: string;
	baseUrl: string;
	auth: CustomNodeAuth;
	iconUrl?: string;
}

export const ADDITIONAL_FIELDS = 'additionalFields';

/** Parameter names of the inputs. A parent node needs names that differ from its own parameters. */
export interface InputNaming {
	/** Node parameter name of a required input. */
	parameterName(inputName: string): string;
	/** Name of the collection that holds the optional inputs. */
	additionalFields: string;
}

export const PLAIN_NAMING: InputNaming = {
	parameterName: (inputName) => inputName,
	additionalFields: ADDITIONAL_FIELDS,
};

/** Input names that would collide with a parameter of the generated node or of a parent node. */
export const RESERVED_INPUT_NAMES: readonly string[] = [
	OPERATION_PARAMETER,
	'resource',
	'authentication',
	'requestOptions',
	ADDITIONAL_FIELDS,
	PIN_ACTION_ID_PARAMETER,
	PIN_ACTION_NAME_PARAMETER,
];

/** Body keys that would change the prototype of an object instead of adding a key. */
export const RESERVED_BODY_KEYS: readonly string[] = ['__proto__', 'constructor', 'prototype'];

const INPUT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;
const VALUE_EXPRESSION = '={{ $value }}';
// `parseJson()` throws an error that the engine forwards. A `JSON.parse` error is ignored.
const JSON_VALUE_EXPRESSION = '={{ typeof $value === "string" ? $value.parseJson() : $value }}';

function assertNoExpression(text: string, where: string): void {
	if (text.includes('{{') || text.trimStart().startsWith('=')) {
		throw new UnexpectedError(`The ${where} of a custom action contains an expression`);
	}
}

function assertInputName(name: string): void {
	// The name goes into a parameter path inside an expression.
	if (!INPUT_NAME_PATTERN.test(name)) {
		throw new UnexpectedError(`The input name "${name}" is not valid`);
	}
	if (RESERVED_INPUT_NAMES.includes(name)) {
		throw new UnexpectedError(`The input name "${name}" is reserved`);
	}
}

/**
 * Copies a stored body and checks every key and string leaf.
 * Iterative on purpose: a deeply nested body must not overflow the stack.
 */
function copyBody(source: Record<string, unknown>): IDataObject {
	const root: IDataObject = {};
	type Frame = {
		from: unknown;
		assign: (value: IDataObject | GenericValue | GenericValue[]) => void;
	};
	const stack: Frame[] = [];

	const pushEntries = (from: Record<string, unknown>, into: IDataObject) => {
		for (const [key, child] of Object.entries(from)) {
			assertNoExpression(key, 'body');
			if (RESERVED_BODY_KEYS.includes(key)) {
				throw new UnexpectedError(`The body of a custom action has the reserved key "${key}"`);
			}
			stack.push({ from: child, assign: (value) => (into[key] = value) });
		}
	};
	pushEntries(source, root);

	while (stack.length > 0) {
		const { from, assign } = stack.pop()!;
		if (typeof from === 'string') {
			assertNoExpression(from, 'body');
			assign(from);
		} else if (typeof from === 'number' || typeof from === 'boolean' || from === null) {
			assign(from);
		} else if (Array.isArray(from)) {
			const into: GenericValue[] = [];
			assign(into);
			from.forEach((item: unknown, index) =>
				stack.push({ from: item, assign: (value) => (into[index] = value) }),
			);
		} else if (typeof from === 'object') {
			const into: IDataObject = {};
			assign(into);
			pushEntries(Object.fromEntries(Object.entries(from)), into);
		} else {
			throw new UnexpectedError('The body of a custom action contains a value that is not JSON');
		}
	}
	return root;
}

function copyStringRecord(source: Record<string, string>, where: string): IDataObject {
	const copy: IDataObject = {};
	for (const [key, value] of Object.entries(source)) {
		assertNoExpression(key, where);
		assertNoExpression(value, where);
		copy[key] = value;
	}
	return copy;
}

/**
 * Expression for one URL segment. Encoding keeps `/`, `?`, and `#` out of the path.
 * An empty value, `.`, and `..` would change the path structure. The URL parser treats a dot
 * segment as such also when it is encoded once, so these values become dots encoded twice.
 * The remote API then gets a segment that it cannot match.
 * The expression must not throw: the legacy engine ignores an error from expression code.
 * `encodeURIComponent` throws for a lone surrogate, so `toWellFormed()` replaces it first.
 */
function segmentExpression(paramPath: string): string {
	return `{{ ((v) => (v === "" || v === "." ? "%252E" : v === ".." ? "%252E%252E" : encodeURIComponent(v.toWellFormed())))(String(${paramPath})) }}`;
}

/**
 * Turns the stored URL into a plain string or an expression. Each placeholder `{name}` becomes
 * an encoded value, so an input value cannot change the host or the path structure.
 */
function buildUrl(
	url: string,
	inputTargets: StoredRequest['inputTargets'],
	param: (inputName: string) => string,
): string {
	assertNoExpression(url, 'URL');

	const absolute = /^([^:/?#]*:\/\/[^/?#]*)(.*)$/s.exec(url);
	const origin = absolute ? absolute[1] : '';
	const rest = absolute ? absolute[2] : url;
	const split = rest.search(/[?#]/);
	const path = split === -1 ? rest : rest.slice(0, split);
	const tail = split === -1 ? '' : rest.slice(split);

	if (/[{}]/.test(origin) || /[{}]/.test(tail)) {
		throw new UnexpectedError('A custom action URL has a placeholder outside the path');
	}
	if (/[{}]/.test(path.replace(PLACEHOLDER_PATTERN, ''))) {
		throw new UnexpectedError('A custom action URL has an unmatched brace');
	}
	if (!/\{[^{}]*\}/.test(path)) return url;

	const expressionPath = path.replace(PLACEHOLDER_PATTERN, (_match, name: string) => {
		assertInputName(name);
		const placement = inputTargets[name];
		if (placement?.target !== 'url' || placement.key !== name) {
			throw new UnexpectedError(`The URL placeholder {${name}} has no URL input`);
		}
		return segmentExpression(param(name));
	});
	return `=${origin}${expressionPath}${tail}`;
}

const hasHeader = (headers: IDataObject, name: string) =>
	Object.keys(headers).some((key) => key.toLowerCase() === name);

/** Fixed request of one version. `param(name)` returns the expression path of an input. */
export function buildRequest(
	version: ActionVersionView,
	param: (inputName: string) => string,
): DeclarativeRestApiSettings.HttpRequestOptions {
	const { request } = version;

	for (const [name, placement] of Object.entries(request.inputTargets)) {
		assertNoExpression(name, 'input name');
		assertNoExpression(placement.key, 'input key');
	}

	const headers = copyStringRecord(request.headers, 'headers');
	const qs = copyStringRecord(request.query, 'query');
	const body = request.bodyType === 'none' ? undefined : copyBody(request.body);

	if (request.bodyType === 'form' && !hasHeader(headers, 'content-type')) {
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}

	const options: DeclarativeRestApiSettings.HttpRequestOptions = {
		method: request.method,
		url: buildUrl(request.url, request.inputTargets, param),
	};
	if (Object.keys(headers).length > 0) options.headers = headers;
	if (Object.keys(qs).length > 0) options.qs = qs;
	if (body && Object.keys(body).length > 0) options.body = body;
	return options;
}

function defaultFor(input: StoredInput): NodeParameterValueType {
	if (input.default !== undefined) return input.default;
	switch (input.type) {
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'options':
			return input.options?.[0]?.value ?? '';
		case 'json':
			return '{}';
		case 'string':
			return '';
	}
}

function routingFor(
	input: StoredInput,
	placement: StoredRequest['inputTargets'][string],
): INodePropertyRouting | undefined {
	const value = input.type === 'json' ? JSON_VALUE_EXPRESSION : VALUE_EXPRESSION;
	switch (placement.target) {
		case 'body':
			// Dot and bracket notation of the key builds nested objects.
			return { send: { type: 'body', property: placement.key, value } };
		case 'query':
			return {
				send: {
					type: 'query',
					property: placement.key,
					propertyInDotNotation: false,
					...(input.type === 'json' && { value }),
				},
			};
		case 'header':
			return { request: { headers: { [placement.key]: value } } };
		case 'url':
			return undefined;
	}
}

function inputProperty(
	input: StoredInput,
	placement: StoredRequest['inputTargets'][string],
): INodeProperties {
	// A default or option value becomes a parameter value, and parameter values are evaluated.
	if (typeof input.default === 'string') assertNoExpression(input.default, 'input default');
	input.options?.forEach((option) => assertNoExpression(option.value, 'option value'));
	assertNoExpression(placement.key, 'input key');

	const property: INodeProperties = {
		displayName: input.displayName,
		name: input.name,
		type: input.type,
		default: defaultFor(input),
	};
	if (input.description !== undefined) property.description = input.description;
	if (input.required) property.required = true;
	if (input.type === 'options') {
		property.options = (input.options ?? []).map(
			(option): INodePropertyOptions => ({ name: option.name, value: option.value }),
		);
	}
	const routing = routingFor(input, placement);
	if (routing) property.routing = routing;
	return property;
}

/** Required inputs are top-level properties. Optional inputs are in an "Additional Fields" collection. */
export function buildInputProperties(
	version: ActionVersionView,
	show: NonNullable<IDisplayOptions['show']>,
	naming: InputNaming = PLAIN_NAMING,
): INodeProperties[] {
	const required: INodeProperties[] = [];
	const optional: INodeProperties[] = [];

	for (const input of version.inputs) {
		assertInputName(input.name);
		const placement = version.request.inputTargets[input.name];
		if (!placement) {
			throw new UnexpectedError(`The stored request has no target for input "${input.name}"`);
		}
		const property = inputProperty(input, placement);
		if (input.required) {
			required.push({
				...property,
				name: naming.parameterName(input.name),
				displayOptions: { show },
			});
		} else {
			optional.push(property);
		}
	}

	if (optional.length === 0) return required;
	return [
		...required,
		{
			displayName: 'Additional Fields',
			name: naming.additionalFields,
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			options: optional,
			displayOptions: { show },
		},
	];
}

/** Expression path of an input, for `buildRequest`. */
export function paramPathFor(
	version: ActionVersionView,
	naming: InputNaming = PLAIN_NAMING,
): (inputName: string) => string {
	const requiredByName = new Map(version.inputs.map((input) => [input.name, input.required]));
	return (name: string) => {
		assertInputName(name);
		if (requiredByName.get(name) === false) {
			return `($parameter["${naming.additionalFields}"]?.["${name}"] ?? "")`;
		}
		return `$parameter["${naming.parameterName(name)}"]`;
	};
}

function credentialsFor(auth: CustomNodeAuth): INodeCredentialDescription[] {
	switch (auth.kind) {
		case 'none':
			return [];
		case 'predefined':
			return [{ name: auth.credentialType, required: true }];
		case 'generic':
			return [{ name: auth.type, required: true }];
	}
}

/** Version refs of the actions that have a version. Throws for an action id that is not plain. */
export function actionVersionRefs(actions: ActionView[]): ActionVersionsRef[] {
	// An action id is part of the `operation` value, and parameter values are evaluated.
	for (const action of actions) assertNoExpression(action.id, 'action id');
	return actions
		.filter((action) => action.versions.length > 0)
		.map((action) => ({
			id: action.id,
			name: action.name,
			...(action.description !== undefined && { description: action.description }),
			versions: action.versions.map((v) => v.version),
		}));
}

/**
 * The `operation` options with the fixed request of each version, and the input properties
 * of each version. `RoutingNode` runs the result.
 */
export function buildRoutedActionProperties(
	actions: ActionView[],
	naming: InputNaming = PLAIN_NAMING,
): {
	refs: ActionVersionsRef[];
	options: INodePropertyOptions[];
	inputProperties: INodeProperties[];
} {
	const refs = actionVersionRefs(actions);
	const options = operationOptions(refs);
	const inputProperties: INodeProperties[] = [];

	for (const action of actions) {
		for (const version of action.versions) {
			const show = showFor(action.id, version.version);
			// Match options by the values that `version-pin.ts` builds. Never parse them here.
			const option = options.find((o) => (show[OPERATION_PARAMETER] ?? []).includes(o.value));
			if (!option) {
				throw new UnexpectedError(
					`No operation option for version ${version.version} of action "${action.id}"`,
				);
			}
			option.routing = { request: buildRequest(version, paramPathFor(version, naming)) };
			inputProperties.push(...buildInputProperties(version, show, naming));
		}
	}
	return { refs, options, inputProperties };
}

export function generateCustomNodeDescription(
	node: CustomNodeView,
	actions: ActionView[],
): INodeTypeDescription {
	// `RoutingNode` evaluates the values of `requestDefaults`, so the base URL must be plain.
	assertNoExpression(node.baseUrl, 'base URL');

	const { refs, options, inputProperties } = buildRoutedActionProperties(actions);
	// The loader skips a node that throws here. Other code reads the last `operation` option.
	if (refs.length === 0) {
		throw new UnexpectedError('A custom node has no action with a version');
	}

	const operationProperty: INodeProperties = {
		displayName: 'Action',
		name: OPERATION_PARAMETER,
		type: 'options',
		noDataExpression: true,
		// Never an action value: a save strips a value equal to the default, and the pin is lost.
		default: '',
		options,
	};

	return {
		displayName: node.displayName,
		name: node.id,
		...(node.iconUrl ? { iconUrl: node.iconUrl } : { icon: 'fa:cube' }),
		group: ['transform'],
		version: 1,
		// No `subtitle`: the editor then shows the name of the selected `operation` option.
		description: node.description ?? 'A custom node of this instance',
		defaults: { name: node.displayName },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: credentialsFor(node.auth),
		requestDefaults: { baseURL: node.baseUrl, json: true },
		// The host comes from an administrator, not from n8n. See `RoutingNode`.
		userDefinedEndpoint: true,
		properties: [operationProperty, ...pinProperties(refs), ...inputProperties],
	};
}
