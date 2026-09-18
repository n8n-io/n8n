import type {
	CustomNodeAuth,
	CustomNodeDefinition,
	CustomOperationDefinition,
	CustomOperationInput,
	CustomOperationVersion,
} from '@n8n/api-types';
import set from 'lodash/set';
import type {
	IDataObject,
	INodeCredentialDescription,
	INodeProperties,
	INodePropertyOptions,
	INodePropertyRouting,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeParameterValueType,
	NodePropertyTypes,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * Turns stored Custom Operation / Custom Node definitions into declarative
 * node descriptions. The output is executed by `RoutingNode` in `n8n-core`:
 * fixed request data goes into `requestDefaults` (single operation) or into the
 * `routing.request` of the selected `operation` option (custom node), and every
 * user input carries a `routing` that injects its value into the request.
 *
 * Descriptions use the **bare** node name (the definition id). The package
 * prefix is added by `LoadNodesAndCredentials.postProcessLoaders`.
 */

export const ADDITIONAL_FIELDS_NAME = 'additionalFields';
export const OPERATION_PARAMETER_NAME = 'operation';
const PLACEHOLDER_REGEX = /\{\{\s*\$parameter(?:\.([A-Za-z_][A-Za-z0-9_]*)|\["([^"]+)"\]|\['([^']+)'\])\s*\}\}/g;

/** Subset of the parent node description that a custom operation borrows. */
export type ParentNodeInfo = Pick<
	INodeTypeBaseDescription,
	'displayName' | 'icon' | 'iconUrl' | 'iconColor' | 'iconBasePath' | 'group'
>;

export interface OperationGeneratorContext {
	parent?: ParentNodeInfo;
}

export interface CustomNodeGeneratorContext {
	/** URL the frontend can load the uploaded icon from. */
	iconUrl?: string;
}

/** The result of laying out the inputs of one version as node properties. */
interface InputLayout {
	/** Parameter path (as used in `$parameter`) for each input name. */
	pathByName: Record<string, string>;
	required: INodeProperties[];
	additionalFields?: INodeProperties;
}

export function authToCredentials(auth: CustomNodeAuth): INodeCredentialDescription[] {
	switch (auth.kind) {
		case 'none':
			return [];
		case 'predefined':
			return [{ name: auth.credentialType, required: true }];
		case 'generic':
			return [{ name: auth.type, required: true }];
	}
}

/**
 * Rewrites `{{ $parameter.foo }}` placeholders to the real parameter path and
 * prefixes the string with `=` so the expression engine evaluates it.
 */
export function templateToExpression(template: string, pathByName: Record<string, string>): string {
	if (!template.includes('{{')) return template;
	const body = template.startsWith('=') ? template.slice(1) : template;
	const rewritten = body.replace(PLACEHOLDER_REGEX, (_match, dot, dq, sq) => {
		const name: string = dot ?? dq ?? sq;
		const path = pathByName[name] ?? `$parameter["${name}"]`;
		return `{{ ${path} }}`;
	});
	return `=${rewritten}`;
}

function rewriteLeaves(value: unknown, pathByName: Record<string, string>): unknown {
	if (typeof value === 'string') return templateToExpression(value, pathByName);
	if (Array.isArray(value)) return value.map((item) => rewriteLeaves(item, pathByName));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, rewriteLeaves(item, pathByName)]),
		);
	}
	return value;
}

function parseBodyTemplate(body: string | undefined): IDataObject {
	if (!body?.trim()) return {};
	try {
		const parsed: unknown = JSON.parse(body);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as IDataObject)
			: {};
	} catch {
		return {};
	}
}

/**
 * Builds the fixed part of the request: method, URL and everything the user
 * marked as fixed. Inputs are added separately through `routing`.
 */
export function buildFixedRequest(
	version: CustomOperationVersion,
	pathByName: Record<string, string>,
): NonNullable<INodePropertyRouting['request']> {
	const { request, fixedData } = version;
	const headers: IDataObject = { ...request.headers };
	const qs: IDataObject = { ...request.query };
	let body: IDataObject | undefined =
		request.bodyType === 'none' ? undefined : parseBodyTemplate(request.body);

	for (const entry of fixedData) {
		if (entry.target === 'header') headers[entry.key] = entry.value;
		if (entry.target === 'query') qs[entry.key] = entry.value;
		if (entry.target === 'body') {
			body ??= {};
			set(body, entry.key, entry.value);
		}
	}

	if (request.bodyType === 'form' && !hasHeader(headers, 'content-type')) {
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
	}

	const fixed: NonNullable<INodePropertyRouting['request']> = {
		method: request.method,
		url: templateToExpression(request.url, pathByName),
		json: true,
	};
	if (Object.keys(headers).length) fixed.headers = rewriteLeaves(headers, pathByName) as IDataObject;
	if (Object.keys(qs).length) fixed.qs = rewriteLeaves(qs, pathByName) as IDataObject;
	if (body && Object.keys(body).length) fixed.body = rewriteLeaves(body, pathByName) as IDataObject;
	return fixed;
}

function hasHeader(headers: IDataObject, name: string) {
	return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

function inputTypeToNodeType(type: CustomOperationInput['type']): NodePropertyTypes {
	return type;
}

function defaultForInput(input: CustomOperationInput): NodeParameterValueType {
	const { default: value } = input;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	switch (input.type) {
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'options':
			return input.options?.[0]?.value ?? '';
		case 'json':
			return '{}';
		default:
			return '';
	}
}

function valueExpression(input: CustomOperationInput): string {
	if (input.type === 'json') {
		return '={{ typeof $value === "string" ? JSON.parse($value) : $value }}';
	}
	return '={{ $value }}';
}

/** Routing that injects one input into the request. URL inputs need none. */
export function inputRouting(input: CustomOperationInput): INodePropertyRouting | undefined {
	switch (input.target) {
		case 'body':
			return { send: { type: 'body', property: input.key, value: valueExpression(input) } };
		case 'query':
			return {
				send: {
					type: 'query',
					property: input.key,
					propertyInDotNotation: false,
					value: valueExpression(input),
				},
			};
		case 'header':
			return { request: { headers: { [input.key]: valueExpression(input) } } };
		case 'url':
			return undefined;
	}
}

function inputToProperty(input: CustomOperationInput): INodeProperties {
	const property: INodeProperties = {
		displayName: input.displayName,
		name: input.name,
		type: inputTypeToNodeType(input.type),
		default: defaultForInput(input),
		description: input.description,
		required: input.required || undefined,
	};
	if (input.type === 'options') {
		property.options = (input.options ?? []).map<INodePropertyOptions>((option) => ({
			name: option.name,
			value: option.value,
		}));
	}
	const routing = inputRouting(input);
	if (routing) property.routing = routing;
	return property;
}

/**
 * Required inputs become top-level parameters. Optional inputs go into an
 * "Additional Fields" collection, mirroring how built-in nodes do it.
 */
export function layoutInputs(
	version: CustomOperationVersion,
	displayOptions?: INodeProperties['displayOptions'],
): InputLayout {
	const pathByName: Record<string, string> = {};
	const required: INodeProperties[] = [];
	const optional: INodeProperties[] = [];

	for (const input of version.inputs) {
		const property = inputToProperty(input);
		if (input.required) {
			pathByName[input.name] = `$parameter["${input.name}"]`;
			if (displayOptions) property.displayOptions = displayOptions;
			required.push(property);
		} else {
			pathByName[input.name] = `($parameter["${ADDITIONAL_FIELDS_NAME}"]?.["${input.name}"] ?? "")`;
			optional.push(property);
		}
	}

	const additionalFields: INodeProperties | undefined = optional.length
		? {
				displayName: 'Additional Fields',
				name: ADDITIONAL_FIELDS_NAME,
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: optional,
				displayOptions,
			}
		: undefined;

	return { pathByName, required, additionalFields };
}

function getVersion(definition: CustomOperationDefinition, version: number) {
	const found = definition.versions.find((v) => v.version === version);
	if (!found) {
		throw new Error(`Version ${version} of custom operation "${definition.name}" does not exist`);
	}
	return found;
}

export function getActiveVersion(definition: CustomOperationDefinition) {
	return getVersion(definition, definition.activeVersion);
}

/**
 * One description per stored version of a Custom Operation that extends an
 * existing node type. `defaultVersion` points at the active version so new
 * nodes get it while existing nodes stay pinned to the version they were
 * created with.
 */
export function generateOperationNodeDescriptions(
	definition: CustomOperationDefinition,
	context: OperationGeneratorContext = {},
): INodeTypeDescription[] {
	const { parent } = context;
	const displayName = parent ? `${parent.displayName}: ${definition.name}` : definition.name;

	return definition.versions.map((version) => {
		const layout = layoutInputs(version);
		const properties: INodeProperties[] = [...layout.required];
		if (layout.additionalFields) properties.push(layout.additionalFields);

		const description: INodeTypeDescription = {
			displayName,
			name: definition.id,
			icon: parent?.icon ?? 'fa:cube',
			iconUrl: parent?.iconUrl,
			iconColor: parent?.iconColor,
			iconBasePath: parent?.iconBasePath,
			group: ['transform'],
			version: version.version,
			defaultVersion: definition.activeVersion,
			subtitle: parent ? `${parent.displayName} · Custom operation` : 'Custom operation',
			description:
				definition.description ??
				(parent
					? `Custom operation for ${parent.displayName}`
					: `Custom operation "${definition.name}"`),
			defaults: { name: definition.name },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: authToCredentials(version.request.auth),
			requestDefaults: buildFixedRequest(version, layout.pathByName),
			properties,
			// Listed under the parent node's actions, not as a standalone node
			hidden: true,
			customDefinition: {
				definitionId: definition.id,
				parentNodeType: definition.parentNodeType,
				customNodeId: definition.customNodeId,
			},
		};
		return description;
	});
}

/**
 * A Custom Node bundles its operations as an `operation` options parameter.
 * Each option carries the fixed request of that operation's active version.
 */
export function generateCustomNodeDescription(
	node: CustomNodeDefinition,
	operations: CustomOperationDefinition[],
	context: CustomNodeGeneratorContext = {},
): INodeTypeDescription {
	const ordered = node.operationIds
		.map((id) => operations.find((op) => op.id === id))
		.filter((op): op is CustomOperationDefinition => op !== undefined);

	const options: INodePropertyOptions[] = [];
	const properties: INodeProperties[] = [];

	for (const operation of ordered) {
		const version = getActiveVersion(operation);
		const displayOptions = { show: { [OPERATION_PARAMETER_NAME]: [operation.id] } };
		const layout = layoutInputs(version, displayOptions);
		options.push({
			name: operation.name,
			value: operation.id,
			action: operation.name,
			description: operation.description,
			routing: { request: buildFixedRequest(version, layout.pathByName) },
		});
		properties.push(...layout.required);
		if (layout.additionalFields) properties.push(layout.additionalFields);
	}

	const operationProperty: INodeProperties = {
		displayName: 'Operation',
		name: OPERATION_PARAMETER_NAME,
		type: 'options',
		noDataExpression: true,
		default: ordered[0]?.id ?? '',
		options,
	};

	return {
		displayName: node.displayName,
		name: node.id,
		icon: context.iconUrl ? undefined : 'fa:cube',
		iconUrl: context.iconUrl,
		group: ['transform'],
		version: 1,
		subtitle: `={{ $parameter["${OPERATION_PARAMETER_NAME}"] }}`,
		description: node.description ?? `Custom node "${node.displayName}"`,
		defaults: { name: node.displayName },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: authToCredentials(node.auth),
		requestDefaults: { baseURL: node.baseUrl || undefined, json: true },
		properties: [operationProperty, ...properties],
		customDefinition: {
			definitionId: node.id,
			parentNodeType: null,
			customNodeId: node.id,
		},
	};
}
