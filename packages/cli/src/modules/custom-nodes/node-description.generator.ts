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
import { OPERATION_PARAMETER, operationOptions, pinProperties, showFor } from './version-pin';

/**
 * Turns a custom node and its actions into a declarative node description.
 * `RoutingNode` runs the result with no extra code.
 *
 * This is a security boundary. `RoutingNode` evaluates every string that starts with `=` as an
 * expression, with access to `$credentials`. Only this file decides which strings start with
 * `=`. A stored string never does: the generator throws when it finds one.
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

export interface CustomNodeView {
	id: string;
	displayName: string;
	description?: string;
	baseUrl: string;
	auth: CustomNodeAuth;
	iconUrl?: string;
}

export const ADDITIONAL_FIELDS = 'additionalFields';

const INPUT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;
const VALUE_EXPRESSION = '={{ $value }}';
const JSON_VALUE_EXPRESSION = '={{ typeof $value === "string" ? JSON.parse($value) : $value }}';

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
		return `{{ encodeURIComponent(${param(name)}) }}`;
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
			required.push({ ...property, displayOptions: { show } });
		} else {
			optional.push(property);
		}
	}

	if (optional.length === 0) return required;
	return [
		...required,
		{
			displayName: 'Additional Fields',
			name: ADDITIONAL_FIELDS,
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			options: optional,
			displayOptions: { show },
		},
	];
}

function paramPathFor(version: ActionVersionView) {
	const requiredByName = new Map(version.inputs.map((input) => [input.name, input.required]));
	return (name: string) => {
		assertInputName(name);
		if (requiredByName.get(name) === false) {
			return `($parameter["${ADDITIONAL_FIELDS}"]?.["${name}"] ?? "")`;
		}
		return `$parameter["${name}"]`;
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

export function generateCustomNodeDescription(
	node: CustomNodeView,
	actions: ActionView[],
): INodeTypeDescription {
	// `requestDefaults` is evaluated with access to `$credentials`.
	assertNoExpression(node.baseUrl, 'base URL');
	// An action id is part of the `operation` value, and parameter values are evaluated.
	for (const action of actions) assertNoExpression(action.id, 'action id');

	const withVersions = actions.filter((action) => action.versions.length > 0);
	const refs = withVersions.map((action) => ({
		id: action.id,
		name: action.name,
		...(action.description !== undefined && { description: action.description }),
		versions: action.versions.map((v) => v.version),
	}));

	const options = operationOptions(refs);
	const inputProperties: INodeProperties[] = [];

	for (const action of withVersions) {
		for (const version of action.versions) {
			const show = showFor(action.id, version.version);
			// Match options by the values that `version-pin.ts` builds. Never parse them here.
			const option = options.find((o) => (show[OPERATION_PARAMETER] ?? []).includes(o.value));
			if (!option) {
				throw new UnexpectedError(
					`No operation option for version ${version.version} of action "${action.id}"`,
				);
			}
			option.routing = { request: buildRequest(version, paramPathFor(version)) };
			inputProperties.push(...buildInputProperties(version, show));
		}
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
