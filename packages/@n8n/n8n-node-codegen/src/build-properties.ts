import type { INodeProperties, INodePropertyOptions, PostReceiveAction } from 'n8n-workflow';
import { titleCase } from 'title-case';

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

const LIMIT_DESCRIPTION = 'Max number of results to return';

const ID_WORD = /\b[iI]d(s?)\b/g;

const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;

const WORD_SEPARATORS = /[_-]+/g;

const PATH_PARAMETER = /\{(\w+)\}/g;

const QUOTED_KEY = /^(\t*)"([A-Za-z_$][\w$]*)":/gm;

// The n8n node lint rules need names in title case, with ID in upper case.
// Before: add a column to a data table id
// After:  Add a Column to a Data Table ID
const titleOf = (text: string) => titleCase(text).replace(ID_WORD, 'ID$1');

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

const pathLocator = ({ operation, fields }: OperationRow) =>
	operation.parameters.find(
		({ name, location }) => location === 'path' && fields[name]?.type === 'resourceLocator',
	);

// The API path has placeholders, but the node needs a URL with the field values in it.
// The locator field sends this URL, so the locator value is $value, the ID that n8n gets from the URL or the list.
// Before: /workflows/{workflowId}/versions/{versionId}
// After:  =/workflows/{{ toPathSegment($value) }}/versions/{{ toPathSegment($parameter["versionId"]) }}
function urlOf(apiPath: string, locator?: string): string {
	const url = apiPath.replace(PATH_PARAMETER, (_, name: string) => {
		const value = name === locator ? '$value' : `$parameter[${JSON.stringify(name)}]`;
		return `{{ toPathSegment(${value}) }}`;
	});
	return url === apiPath ? url : `=${url}`;
}

function propertyOf(
	parameter: ApiParameter,
	override?: Partial<INodeProperties>,
	url?: string,
): INodeProperties {
	const { value, ...field } = fieldOf(parameter);
	return {
		displayName: titleOf(
			parameter.name.replace(CAMEL_CASE_BOUNDARY, '$1 $2').replace(WORD_SEPARATORS, ' '),
		),
		name: parameter.name,
		...field,
		description: parameter.description,
		...override,
		routing: url === undefined ? routingOf(parameter, value) : { request: { url } },
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

function operationOption(row: OperationRow, options: SpecOptions): INodePropertyOptions {
	const { operation } = row;
	const label = operationLabel(operation);
	const postReceive = postReceiveOf(operation, options);
	const { method, apiPath } = operation;
	return {
		name: titleOf(label),
		value: operation.operationId,
		action: label,
		routing: {
			request: pathLocator(row) ? { method } : { method, url: urlOf(apiPath) },
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

function operationProperties(row: OperationRow, options: SpecOptions): INodeProperties[] {
	const { operation, resource, fields } = row;
	const show = { resource: [resource.id], operation: [operation.operationId] };
	const locator = pathLocator(row);
	const build = (parameter: ApiParameter, standard: Partial<INodeProperties> = {}) =>
		propertyOf(
			parameter,
			{ ...standard, ...fields[parameter.name] },
			parameter === locator ? urlOf(operation.apiPath, locator.name) : undefined,
		);
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
		...build(parameter),
		required: true,
		displayOptions: { show },
	}));
	if (operation.paginated) {
		properties.push({ ...returnAllProperty(operation, options), displayOptions: { show } });
	}
	if (limit) {
		properties.push({
			...build(limit, {
				description: LIMIT_DESCRIPTION,
				typeOptions: {
					minValue: Math.max(1, limit.schema.minimum ?? 1),
					maxValue: limit.schema.maximum,
				},
			}),
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
			options: optional
				.map((parameter) => build(parameter))
				.sort((a, b) => a.name.localeCompare(b.name, 'en')),
		});
	}
	return properties;
}

function selector(
	name: 'resource' | 'operation',
	options: INodePropertyOptions[],
	defaultValue: string | undefined,
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
		default: defaultValue ?? sorted[0].value,
	};
}

export function buildProperties(
	rows: OperationRow[],
	options: SpecOptions,
	defaultResource?: string,
): INodeProperties[] {
	const rowsByResource = new Map<string, { resource: Resource; rows: OperationRow[] }>();
	for (const row of rows) {
		const group = rowsByResource.get(row.resource.id) ?? { resource: row.resource, rows: [] };
		group.rows.push(row);
		rowsByResource.set(row.resource.id, group);
	}
	const groups = [...rowsByResource.values()];
	if (groups.length === 0) return [];

	const resources = groups.map(({ resource }) => ({
		name: titleOf(resource.displayName),
		value: resource.id,
	}));
	const resourceSelector = selector('resource', resources, defaultResource);

	const resourceProperties = groups.flatMap((group) => {
		const operations = group.rows.map((row) => operationOption(row, options));
		const defaultOperation = group.rows.find((row) => row.isDefault)?.operation.operationId;
		const show = { resource: [group.resource.id] };
		const operationSelector = selector('operation', operations, defaultOperation, show);
		const fields = group.rows.flatMap((row) => operationProperties(row, options));
		return [operationSelector, ...fields];
	});

	return [resourceSelector, ...resourceProperties];
}

export function renderProperties(properties: INodeProperties[]): string {
	// The n8n node lint rules check only keys without quotes.
	// Before: "displayName": "Name"
	// After:  displayName: "Name"
	const literal = JSON.stringify(properties, null, '\t').replace(QUOTED_KEY, '$1$2:');
	return `import type { INodeProperties } from 'n8n-workflow';\n\nexport const properties: INodeProperties[] = ${literal};\n`;
}
