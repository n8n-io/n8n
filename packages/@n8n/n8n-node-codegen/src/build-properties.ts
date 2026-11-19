import type { INodeProperties, INodePropertyOptions, PostReceiveAction } from 'n8n-workflow';

import type {
	ApiParameter,
	OperationRow,
	Resource,
	Schema,
	SpecOperation,
	SpecOptions,
} from './types';

export const NODE_PARAMETER_NAMES = ['resource', 'operation', 'returnAll', 'options'];

export const operationLabel = ({ summary, deprecated }: SpecOperation) =>
	deprecated ? `${summary} (deprecated)` : summary;

const PARSED_JSON = '={{ typeof $value === "string" ? $value.parseJson() : $value }}';

type Field = Pick<INodeProperties, 'type' | 'default' | 'options' | 'typeOptions'> & {
	value?: string;
};

const isBooleanString = ({ type, enum: values }: Schema) =>
	type === 'string' && values?.length === 2 && values.includes('true') && values.includes('false');

function choicesOf({ type, enum: values, anyOf = [] }: Schema): unknown[] | undefined {
	if (type === 'string') return values;
	if (anyOf.length === 0 || anyOf.some((branch) => branch.type !== 'string')) return undefined;
	const choices = anyOf.flatMap((branch) => branch.enum ?? []);
	return choices.length > 0 ? [...new Set(choices)] : undefined;
}

function numberField({ default: value, minimum, maximum }: Schema): Field {
	return {
		type: 'number',
		default: typeof value === 'number' ? value : (minimum ?? 0),
		typeOptions:
			minimum === undefined && maximum === undefined
				? undefined
				: { minValue: minimum, maxValue: maximum },
	};
}

function fieldOf({ schema, location }: ApiParameter): Field {
	if (isBooleanString(schema)) {
		return { type: 'boolean', default: schema.default === 'true', value: '={{ String($value) }}' };
	}
	const choices = choicesOf(schema);
	if (choices) {
		const options = choices.map((value) => ({ name: String(value), value: String(value) }));
		const value = typeof schema.default === 'string' ? schema.default : '';
		return { type: 'options', default: value, options };
	}
	switch (schema.type) {
		case 'string':
			return { type: 'string', default: typeof schema.default === 'string' ? schema.default : '' };
		case 'integer':
		case 'number':
			return location === 'path' ? { type: 'string', default: '' } : numberField(schema);
		case 'boolean':
			return { type: 'boolean', default: schema.default === true };
		default:
			return { type: 'json', default: schema.type === 'array' ? '[]' : '{}', value: PARSED_JSON };
	}
}

function routingOf(
	{ location, name, property = name }: ApiParameter,
	value?: string,
): INodeProperties['routing'] {
	if (location === 'path') return undefined;
	if (location === 'wholeBody') return { request: { body: value ?? '={{ $value }}' } };
	return { send: { type: location, property, value } };
}

function propertyOf(parameter: ApiParameter): INodeProperties {
	const { value, ...field } = fieldOf(parameter);
	return {
		displayName: parameter.name,
		name: parameter.name,
		...field,
		description: parameter.description,
		routing: routingOf(parameter, value),
	};
}

function postReceiveOf(
	operation: SpecOperation,
	options: SpecOptions,
): PostReceiveAction[] | undefined {
	if (operation.paginated) {
		return [{ type: 'rootProperty', properties: { property: options.itemsProperty } }];
	}
	if (operation.emptyResponse) {
		return [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }];
	}
	return undefined;
}

function operationOption(operation: SpecOperation, options: SpecOptions): INodePropertyOptions {
	const url = operation.apiPath.replace(
		/\{(\w+)\}/g,
		(_, name: string) => `{{ toPathSegment($parameter[${JSON.stringify(name)}]) }}`,
	);
	const label = operationLabel(operation);
	const postReceive = postReceiveOf(operation, options);
	return {
		name: label,
		value: operation.operationId,
		action: label,
		routing: {
			request: { method: operation.method, url: url === operation.apiPath ? url : `=${url}` },
			output: postReceive && { postReceive },
		},
	};
}

function returnAllProperty(operation: SpecOperation, options: SpecOptions): INodeProperties {
	const nextCursor = `$response.body?.${options.nextCursorProperty}`;
	const qs = Object.fromEntries(
		operation.parameters
			.filter((parameter) => parameter.location === 'query')
			.map(({ name }) => [name, `={{ $request.qs?.[${JSON.stringify(name)}] }}`]),
	);
	return {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: `={{ !!${nextCursor} }}`,
						request: { qs: { ...qs, [options.cursorParameter]: `={{ ${nextCursor} }}` } },
					},
				},
			},
		},
	};
}

function operationProperties(
	{ operation, resource }: OperationRow,
	options: SpecOptions,
): INodeProperties[] {
	const show = { resource: [resource.id], operation: [operation.operationId] };
	const isLimit = (parameter: ApiParameter) =>
		operation.paginated && parameter.name === options.limitParameter;
	const required = operation.parameters.filter(
		(parameter) => parameter.required && !isLimit(parameter),
	);
	const optional = operation.parameters.filter(
		(parameter) => !parameter.required && !isLimit(parameter),
	);
	const limit = operation.parameters.find(isLimit);

	const properties: INodeProperties[] = required.map((parameter) => ({
		...propertyOf(parameter),
		required: true,
		displayOptions: { show },
	}));
	if (operation.paginated) {
		properties.push({ ...returnAllProperty(operation, options), displayOptions: { show } });
	}
	if (limit) {
		properties.push({
			...propertyOf(limit),
			...(limit.required ? { required: true } : {}),
			displayOptions: { show: { ...show, returnAll: [false] } },
		});
	}
	if (optional.length > 0) {
		properties.push({
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show },
			options: optional.map(propertyOf).sort((a, b) => a.name.localeCompare(b.name, 'en')),
		});
	}
	return properties;
}

function selector(
	name: 'resource' | 'operation',
	options: INodePropertyOptions[],
	show?: { resource: string[] },
): INodeProperties {
	const sorted = options.sort((a, b) => a.name.localeCompare(b.name, 'en'));
	return {
		displayName: name === 'resource' ? 'Resource' : 'Operation',
		name,
		type: 'options',
		noDataExpression: true,
		displayOptions: show && { show },
		options: sorted,
		default: sorted[0].value,
	};
}

export function buildProperties(rows: OperationRow[], options: SpecOptions): INodeProperties[] {
	const rowsByResource = new Map<string, { resource: Resource; rows: OperationRow[] }>();
	for (const row of rows) {
		const group = rowsByResource.get(row.resource.id) ?? { resource: row.resource, rows: [] };
		rowsByResource.set(row.resource.id, { ...group, rows: [...group.rows, row] });
	}
	if (rowsByResource.size === 0) return [];

	const groups = [...rowsByResource.values()];
	return [
		selector(
			'resource',
			groups.map(({ resource }) => ({ name: resource.displayName, value: resource.id })),
		),
		...groups.flatMap(({ resource, rows: resourceRows }) => [
			selector(
				'operation',
				resourceRows.map((row) => operationOption(row.operation, options)),
				{ resource: [resource.id] },
			),
			...resourceRows.flatMap((row) => operationProperties(row, options)),
		]),
	];
}

export const renderProperties = (properties: INodeProperties[]) =>
	`import type { INodeProperties } from 'n8n-workflow';\n\nexport const properties: INodeProperties[] = ${JSON.stringify(properties, null, '\t')};\n`;
