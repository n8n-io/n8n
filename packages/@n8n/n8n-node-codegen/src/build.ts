import type {
	INodeProperties,
	INodePropertyOptions,
	IN8nRequestOperationPaginationGeneric,
} from 'n8n-workflow';

import type { Overrides, ParamTemplate } from 'n8n-nodes-base/nodes/N8n/v2/define-overrides';
import { OVERRIDES_FILE } from './paths';
import { operationDisplayName, words } from './naming';
import { isFlatObjectList } from './spec';
import type { Field, ResolvedOperation, Schema } from './types';

type Details = Record<string, Record<string, { shape: string; default: unknown }>>;

const COLLECTIONS = [
	['options', 'Options'],
	['additionalFields', 'Additional Fields'],
] as const;

const SHAPES: Record<string, string> = {
	resourceLocator: 'rl',
	number: 'number',
	boolean: 'boolean',
	multiOptions: 'array',
	fixedCollection: 'object',
	collection: 'object',
};

export const shapeOf = (property: INodeProperties) => SHAPES[property.type] ?? 'string';

function cursorPagination(queryNames: string[]): IN8nRequestOperationPaginationGeneric {
	const qs = Object.fromEntries(
		['limit', ...queryNames].map((name) => [name, `={{ $request.qs?.[${JSON.stringify(name)}] }}`]),
	);
	return {
		type: 'generic',
		properties: {
			continue: '={{ !!$response.body?.nextCursor }}',
			request: { qs: { ...qs, cursor: '={{ $response.body?.nextCursor }}' } },
		},
	};
}

const isBooleanString = (schema: Schema) =>
	schema.type === 'string' &&
	schema.enum?.length === 2 &&
	schema.enum.every((v) => v === 'true' || v === 'false');

const toOptions = (values: unknown[]): INodePropertyOptions[] =>
	values.map((v) => ({ name: words(String(v)), value: String(v) }));

const stringDefault = (value: unknown) => (typeof value === 'string' ? value : '');
const numberDefault = (value: unknown) => (typeof value === 'number' ? value : 0);

function scalarProperty(name: string, schema: Schema): INodeProperties | undefined {
	const base = { displayName: words(name), name };
	if (isBooleanString(schema))
		return { ...base, type: 'boolean', default: schema.default === 'true' };
	if (schema.type === 'string' && schema.enum) {
		return {
			...base,
			type: 'options',
			default: stringDefault(schema.default ?? schema.enum[0]),
			options: toOptions(schema.enum),
		};
	}
	if (schema.type === 'array' && schema.items?.enum) {
		return { ...base, type: 'multiOptions', default: [], options: toOptions(schema.items.enum) };
	}
	if (schema.type === 'string' && schema.format === 'date-time')
		return { ...base, type: 'dateTime', default: '' };
	if (schema.type === 'string')
		return { ...base, type: 'string', default: stringDefault(schema.default) };
	if (schema.type === 'integer' || schema.type === 'number') {
		return { ...base, type: 'number', default: numberDefault(schema.default) };
	}
	if (schema.type === 'boolean')
		return { ...base, type: 'boolean', default: schema.default === true };
	return undefined;
}

function listProperty(name: string, schema: Schema): INodeProperties {
	const values = Object.entries(schema.items?.properties ?? {}).flatMap(
		([itemName, itemSchema]) => {
			const property = scalarProperty(itemName, itemSchema);
			if (!property) return [];
			return [
				itemSchema.description
					? { ...property, description: nodeDescription(itemSchema.description) }
					: property,
			];
		},
	);
	return {
		displayName: words(name),
		name,
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: `Add ${words(name)}`,
		options: [{ displayName: words(name), name: 'values', values }],
	};
}

function baseProperty(field: Field): { property: INodeProperties; value?: string } {
	if (isFlatObjectList(field.schema)) {
		return {
			property: listProperty(field.nodeName, field.schema),
			value: '={{ $value.values ?? [] }}',
		};
	}
	const scalar = scalarProperty(field.nodeName, field.schema);
	if (scalar) return { property: scalar };
	return {
		property: {
			displayName: words(field.nodeName),
			name: field.nodeName,
			type: 'json',
			default: field.schema.type === 'array' ? '[]' : '{}',
		},
		value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
	};
}

function sendRouting(
	field: Field,
	value: string | undefined,
	flattened: Field[],
): INodeProperties['routing'] {
	const withValue = value ? { value } : {};
	if (field.location === 'query')
		return { send: { type: 'query', property: field.name, ...withValue } };
	if (field.location === 'body')
		return { send: { type: 'body', property: field.name, ...withValue } };
	if (field.location === 'wholeBody') return { request: { body: value ?? '={{ $value }}' } };
	if (field.location === 'flattened' && flattened[0] === field && field.parent) {
		const entries = flattened.map(
			(f) => `${JSON.stringify(f.name)}: $parameter[${JSON.stringify(f.nodeName)}]`,
		);
		return {
			send: { type: 'body', property: field.parent, value: `={{ [{ ${entries.join(', ')} }] }}` },
		};
	}
	return undefined;
}

function findTemplate(
	op: ResolvedOperation,
	field: Field,
	config: Overrides,
): ParamTemplate | undefined {
	const explicit = config.operations?.[op.key]?.params?.[field.nodeName]?.use;
	if (explicit) return explicit;
	const api = field.wire.replace(/^body:[^[]+\[\]\./, 'body:');
	return (config.rules ?? []).find(
		(rule) => rule.api === api && (!rule.resource || rule.resource === op.resource),
	)?.use;
}

export function nodeDescription(text: string | undefined): string | undefined {
	const trimmed = text?.trim().replace(/\bid\b/g, 'ID');
	if (!trimmed) return undefined;
	const sentences = trimmed.split(/\.\s+/).length;
	return sentences === 1 ? trimmed.replace(/\.$/, '') : trimmed;
}

function applyTemplate(
	base: INodeProperties,
	field: Field,
	template: ParamTemplate | undefined,
): INodeProperties {
	const description = nodeDescription(template?.property.description ?? field.description);
	if (!template) return description ? { ...base, description } : base;
	const property: INodeProperties = {
		...base,
		...template.property,
		name: field.nodeName,
		displayName: template.property.displayName ?? base.displayName,
		type: template.property.type ?? base.type,
		default: template.property.default ?? base.default,
	};
	if (description) property.description = description;
	else delete property.description;
	if (template.loadOptions) {
		property.typeOptions = {
			...property.typeOptions,
			loadOptionsMethod: template.loadOptions.name,
		};
	}
	return property;
}

function buildOperation(op: ResolvedOperation, config: Overrides, details: Details) {
	const show = { resource: [op.resource], operation: [op.operation] };
	const operationConfig = config.operations?.[op.key] ?? {};
	const flattened = op.fields.filter((f) => f.location === 'flattened');
	const pathFields = op.fields.filter((f) => f.location === 'path');
	const built = new Map<Field, INodeProperties>();
	details[op.key] = {};

	for (const field of op.fields) {
		const { property: base, value } = baseProperty(field);
		const property = applyTemplate(base, field, findTemplate(op, field, config));
		const routing = sendRouting(field, value, flattened);
		if (routing) property.routing = routing;
		details[op.key][field.nodeName] = { shape: shapeOf(property), default: property.default };
		built.set(field, property);
	}

	const locatorPath = pathFields.find((f) => built.get(f)?.type === 'resourceLocator');
	let url = op.apiPath;
	for (const field of pathFields) {
		const reference =
			field === locatorPath ? '$value' : `$parameter[${JSON.stringify(field.nodeName)}]`;
		url = url.replace(`{${field.name}}`, `{{ toPathSegment(${reference}) }}`);
	}
	const request = { method: op.method, url: url.includes('{{') ? `=${url}` : url };
	const locatorProperty = locatorPath && built.get(locatorPath);
	if (locatorProperty) locatorProperty.routing = { request };

	const postReceive = op.paginated
		? [{ type: 'rootProperty' as const, properties: { property: 'data' } }]
		: op.emptyResponse
			? [{ type: 'set' as const, properties: { value: '={{ { "success": true } }}' } }]
			: undefined;

	const option: INodePropertyOptions = {
		name: operationConfig.displayName ?? operationDisplayName(op.operation),
		value: op.operation,
		action: operationConfig.action ?? op.summary,
		description: nodeDescription(
			[
				(operationConfig.description ?? op.description)?.replace(
					/^Retrieve all /,
					op.operation === 'getAll' ? 'Retrieve many ' : 'Retrieve all ',
				),
				op.scope && `Requires the API key scope "${op.scope}".`,
			]
				.filter(Boolean)
				.join(' '),
		),
		routing: {
			...(locatorProperty ? {} : { request }),
			...(postReceive ? { output: { postReceive } } : {}),
		},
	};

	const properties: INodeProperties[] = [];
	if (op.paginated) {
		const queryNames = op.fields.filter((f) => f.location === 'query').map((f) => f.name);
		properties.push(
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show },
				routing: {
					send: { paginate: '={{ $value }}' },
					operations: { pagination: cursorPagination(queryNames) },
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 250 },
				description: 'Max number of results to return',
				displayOptions: { show: { ...show, returnAll: [false] } },
				routing: { send: { type: 'query', property: 'limit' } },
			},
		);
	}
	for (const field of op.fields.filter((f) => f.placement === 'root')) {
		const property = built.get(field);
		if (property)
			properties.push({
				...property,
				...(field.required ? { required: true } : {}),
				displayOptions: { show },
			});
	}
	for (const [placement, displayName] of COLLECTIONS) {
		const options = op.fields
			.filter((f) => f.placement === placement)
			.flatMap((f) => built.get(f) ?? [])
			.sort((a, b) => a.displayName.localeCompare(b.displayName));
		if (!options.length) continue;
		properties.push({
			displayName,
			name: placement,
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: { show },
			options,
		});
	}

	return { option, properties };
}

export function buildProperties(operations: ResolvedOperation[], config: Overrides) {
	const details: Details = {};
	const resources = [...new Set(operations.map((op) => op.resource))].sort();
	const properties: INodeProperties[] = [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: resources.map((resource) => ({
				name: config.resources?.[resource] ?? words(resource),
				value: resource,
			})),
			default: resources[0],
		},
	];

	for (const resource of resources) {
		const built = operations
			.filter((op) => op.resource === resource)
			.map((op) => buildOperation(op, config, details));
		const options = built.map((b) => b.option).sort((a, b) => a.name.localeCompare(b.name));
		properties.push({
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource] } },
			options,
			default: String(options[0].value),
		});
		properties.push(...built.flatMap((b) => b.properties));
	}

	return { properties, details };
}

export function checkMethodNames(config: Overrides): string[] {
	const errors: string[] = [];
	const templates = [
		...(config.rules ?? []).map((r) => r.use),
		...Object.values(config.operations ?? {}).flatMap((o) =>
			Object.values(o.params ?? {}).flatMap((p) => (p.use ? [p.use] : [])),
		),
	];
	for (const template of templates) {
		const searchMethods =
			JSON.stringify(template.property).match(/"searchListMethod":"([^"]+)"/g) ?? [];
		for (const match of searchMethods) {
			const name = match.split(':')[1].replaceAll('"', '');
			if (template.listSearch?.name !== name) {
				errors.push(
					`${OVERRIDES_FILE}: a template uses searchListMethod "${name}". Pass that function as { listSearch: ${name} } to param().`,
				);
			}
		}
	}
	const byName = new Map<string, unknown>();
	for (const template of templates) {
		for (const [kind, method] of [
			['loadOptions', template.loadOptions],
			['listSearch', template.listSearch],
		] as const) {
			if (!method) continue;
			if (!method.name || method.name === kind) {
				errors.push(
					`${OVERRIDES_FILE}: a template passes an unnamed ${kind} function. Export a named function from methods.ts and pass it.`,
				);
				continue;
			}
			const known = byName.get(`${kind}:${method.name}`);
			if (known && known !== method) {
				errors.push(
					`${OVERRIDES_FILE}: two different ${kind} functions are named "${method.name}". The node registers methods by name, so give each function its own name.`,
				);
			}
			byName.set(`${kind}:${method.name}`, method);
		}
	}
	return [...new Set(errors)];
}
