import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import type {
	ResourceMapperField,
	FieldType,
	INodePropertyOptions,
	IDataObject,
	INode,
} from 'n8n-workflow';
import { isSafeObjectProperty, NodeOperationError } from 'n8n-workflow';

function pickFirstSchema(schema: JSONSchema7Definition): JSONSchema7Definition {
	if (typeof schema === 'object' && (schema?.anyOf || schema?.oneOf)) {
		if (Array.isArray(schema.anyOf) && schema.anyOf[0] !== undefined) {
			return schema.anyOf[0];
		}

		if (Array.isArray(schema.oneOf) && schema.oneOf[0] !== undefined) {
			return schema.oneOf[0];
		}
	}

	return schema;
}

function mergeTwoSchemas(
	a?: JSONSchema7Definition,
	b?: JSONSchema7Definition,
): JSONSchema7Definition | undefined {
	if (a === undefined) {
		return b;
	}

	if (b === undefined) {
		return a;
	}

	a = pickFirstSchema(a);
	b = pickFirstSchema(b);
	if (a === false || b === false) {
		return false;
	}

	if (a === true || b === true) {
		return true;
	}

	if (a.type === 'object' && b.type === 'object') {
		const properties = { ...(a.properties ?? {}), ...(b.properties ?? {}) };
		const required = [...(a.required ?? []), ...(b.required ?? [])];
		const additionalProperties = mergeTwoSchemas(a.additionalProperties, b.additionalProperties);
		return { ...a, ...b, properties, required, additionalProperties };
	}

	if (a.type === 'array' && b.type === 'array') {
		if (Array.isArray(a.items) && Array.isArray(b.items)) {
			// Two tuples -> pick the longer one
			return a.items.length > b.items.length ? a : b;
		}

		if (Array.isArray(a.items) || Array.isArray(b.items)) {
			// One tuple -> pick the tuple
			return Array.isArray(a.items) ? a : b;
		}

		const items = mergeTwoSchemas(a.items, b.items);
		return { ...a, ...b, items };
	}

	return undefined;
}

function mergeAllOfSchemas(schemas: JSONSchema7Definition[]): JSONSchema7Definition | undefined {
	if (schemas.length === 0) {
		return undefined;
	}

	if (schemas.length === 1) {
		return schemas[0];
	}

	return schemas.reduce(
		(acc, schema) => mergeTwoSchemas(acc, schema),
		undefined as JSONSchema7Definition | undefined,
	);
}

export function jsonSchemaTypeToDefaultValue(
	schema: JSONSchema7Definition,
): string | number | boolean | object | null {
	if (schema === false) {
		return null;
	}

	if (schema === true) {
		return 'any';
	}

	if (schema.allOf) {
		const mergedSchema = mergeAllOfSchemas(schema.allOf);
		if (mergedSchema !== undefined) {
			return jsonSchemaTypeToDefaultValue(mergedSchema);
		}
	}

	if (schema.anyOf) {
		const anyOfSchemas = schema.anyOf;
		for (const anyOfSchema of anyOfSchemas) {
			const defaultValue = jsonSchemaTypeToDefaultValue(anyOfSchema);
			if (defaultValue !== null) {
				return defaultValue;
			}
		}
	}

	if (schema.oneOf) {
		const oneOfSchemas = schema.oneOf;
		for (const oneOfSchema of oneOfSchemas) {
			const defaultValue = jsonSchemaTypeToDefaultValue(oneOfSchema);
			if (defaultValue !== null) {
				return defaultValue;
			}
		}
	}

	if (schema.enum && Array.isArray(schema.enum)) {
		return schema.enum[0];
	}

	if (Array.isArray(schema.type)) {
		const types = schema.type;
		for (const type of types) {
			const defaultValue = jsonSchemaTypeToDefaultValue({ type });
			if (defaultValue !== null) {
				return defaultValue;
			}
		}
	}

	if (schema.type === 'number' || schema.type === 'integer') {
		if (schema.minimum !== undefined) {
			return schema.minimum;
		}

		if (schema.maximum !== undefined) {
			return schema.maximum;
		}

		return 0;
	}

	if (schema.type === 'boolean') {
		return false;
	}

	if (schema.type === 'string') {
		if (schema.format === 'date-time') {
			return '2025-01-01T00:00:00Z';
		}

		if (schema.format === 'uri' || schema.format === 'url') {
			return 'https://example.com';
		}

		if (schema.format === 'date') {
			return '2025-01-01';
		}

		if (schema.format === 'time') {
			return '00:00:00';
		}

		return 'string';
	}

	if (schema.type === 'array') {
		if (!schema.items) {
			return [];
		}

		if (Array.isArray(schema.items)) {
			return schema.items.map((item) => jsonSchemaTypeToDefaultValue(item));
		}

		return [jsonSchemaTypeToDefaultValue(schema.items)];
	}

	if (schema.type === 'object') {
		const properties = schema.properties ?? {};
		const exampleObject: IDataObject = {};
		for (const [key, propertySchema] of Object.entries(properties)) {
			const propertyValue = jsonSchemaTypeToDefaultValue(propertySchema);
			if (propertyValue !== null) {
				exampleObject[key] = propertyValue;
			}
		}

		if (schema.additionalProperties) {
			const additionalProperties = jsonSchemaTypeToDefaultValue(schema.additionalProperties);
			if (additionalProperties !== null) {
				exampleObject['<additionalProperty>'] = additionalProperties;
			}
		}

		return exampleObject;
	}

	return null;
}

export function jsonSchemaTypeToFieldType(schema: JSONSchema7): FieldType {
	if (schema.type === 'string' && schema.format === 'date-time') {
		return 'dateTime';
	}

	if (schema.type === 'number' || schema.type === 'integer') {
		return 'number';
	}

	if (schema.type === 'boolean' || schema.type === 'array' || schema.type === 'object') {
		return schema.type;
	}

	return 'string';
}

export function convertJsonSchemaToResourceMapperFields(
	schema: JSONSchema7,
): ResourceMapperField[] {
	const fields: ResourceMapperField[] = [];
	if (schema.type !== 'object' || !schema.properties) {
		return fields;
	}

	const required = Array.isArray(schema.required) ? schema.required : [];
	for (const [key, propertySchema] of Object.entries(schema.properties)) {
		if (propertySchema === false) {
			continue;
		}

		if (propertySchema === true) {
			fields.push({
				id: key,
				displayName: key,
				defaultMatch: false,
				required: required.includes(key),
				display: true,
				type: 'string', // use string as a "catch all" for any values
			});
			continue;
		}

		const schemaType = jsonSchemaTypeToFieldType(propertySchema);
		let defaultValue: string | undefined;
		if (schemaType === 'object' || schemaType === 'array') {
			const result = jsonSchemaTypeToDefaultValue(propertySchema);
			if (result !== null) {
				defaultValue = JSON.stringify(result, null, 2);
			}
		}

		const field: ResourceMapperField = {
			id: key,
			displayName: propertySchema.title ?? key,
			defaultMatch: false,
			required: required.includes(key),
			display: true,
			type: schemaType,
			defaultValue,
		};

		if (propertySchema.enum && Array.isArray(propertySchema.enum)) {
			field.type = 'options';
			field.options = propertySchema.enum.map((value) => ({
				name: value,
				value,
			})) as INodePropertyOptions[];
		}

		fields.push(field);
	}

	return fields;
}

export const MCP_MAX_LIST_PAGES = 100;

type ListPage<T> = {
	items: T[];
	nextCursor?: string;
};

export type ListAllResult<T> = {
	items: T[];
	truncated: boolean;
};

type McpResource = Awaited<ReturnType<Client['listResources']>>['resources'][number];
type McpResourceTemplate = Awaited<
	ReturnType<Client['listResourceTemplates']>
>['resourceTemplates'][number];
type McpPrompt = Awaited<ReturnType<Client['listPrompts']>>['prompts'][number];

async function getAllPages<T>(
	options: RequestOptions,
	listPage: (cursor: string | undefined) => Promise<ListPage<T>>,
): Promise<ListAllResult<T>> {
	let cursor: string | undefined;
	let pages = 0;
	const items: T[] = [];

	while (true) {
		if (options.signal?.aborted) {
			throw new Error('Execution was cancelled');
		}

		const page = await listPage(cursor);
		items.push(...page.items);
		pages += 1;

		const nextCursor = page.nextCursor;
		if (!nextCursor) {
			return { items, truncated: false };
		}

		// Stop on a repeated cursor or at the page cap. Return the data we have
		// instead of discarding it.
		if (nextCursor === cursor || pages >= MCP_MAX_LIST_PAGES) {
			return { items, truncated: true };
		}

		cursor = nextCursor;
	}
}

export async function getAllResources(
	client: Client,
	options: RequestOptions,
): Promise<ListAllResult<McpResource>> {
	return await getAllPages(options, async (cursor) => {
		const { resources, nextCursor } = await client.listResources({ cursor }, options);
		return { items: resources, nextCursor };
	});
}

export async function getAllResourceTemplates(
	client: Client,
	options: RequestOptions,
): Promise<ListAllResult<McpResourceTemplate>> {
	return await getAllPages(options, async (cursor) => {
		const { resourceTemplates, nextCursor } = await client.listResourceTemplates(
			{ cursor },
			options,
		);
		return { items: resourceTemplates, nextCursor };
	});
}

export async function getAllPrompts(
	client: Client,
	options: RequestOptions,
): Promise<ListAllResult<McpPrompt>> {
	return await getAllPages(options, async (cursor) => {
		const { prompts, nextCursor } = await client.listPrompts({ cursor }, options);
		return { items: prompts, nextCursor };
	});
}

/**
 * Turns only the JSON-RPC "method not found" error into a capability-named
 * NodeOperationError. Other errors pass through unchanged so the caller's
 * existing error handling still applies.
 */
export function mapCapabilityError(
	node: INode,
	itemIndex: number,
	capability: 'resources' | 'prompts',
	method: string,
	error: unknown,
): Error {
	if (error instanceof McpError && error.code === Number(ErrorCode.MethodNotFound)) {
		return new NodeOperationError(
			node,
			`This MCP server does not support ${capability} (required for "${method}").`,
			{ itemIndex, description: error.message },
		);
	}

	return error instanceof Error ? error : new Error(String(error));
}

/**
 * Converts the fixedCollection value into the string map the MCP SDK expects.
 * Argument names are user input, so they are validated before they are used as
 * object keys. The value is never included in an error message.
 */
export function buildPromptArguments(
	raw: IDataObject,
	node: INode,
	itemIndex: number,
): Record<string, string> | undefined {
	const entries = raw.arguments;
	if (!Array.isArray(entries) || entries.length === 0) {
		return undefined;
	}

	const result: Record<string, string> = Object.create(null) as Record<string, string>;

	for (const entry of entries) {
		if (typeof entry !== 'object' || entry === null) {
			continue;
		}

		const name = (entry as IDataObject).name;
		if (typeof name !== 'string' || name.length === 0 || !isSafeObjectProperty(name)) {
			throw new NodeOperationError(node, `Prompt argument name "${String(name)}" is not allowed.`, {
				itemIndex,
			});
		}

		result[name] = String((entry as IDataObject).value ?? '');
	}

	return result;
}
