import type { JSONSchema7 } from 'json-schema';
import type {
	ILoadOptionsFunctions,
	ResourceMapperFields,
	ResourceMapperField,
	FieldType,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { McpAuthenticationOption, McpServerTransport } from '../shared/types';
import {
	getAuthHeaders,
	connectMcpClient,
	getAllTools,
	tryRefreshOAuth2Token,
} from '../shared/utils';

function jsonSchemaTypeToFieldType(schema: JSONSchema7): FieldType {
	if (schema.type === 'string') {
		if (schema.format === 'date-time') {
			return 'dateTime';
		}

		if (schema.format === 'time') {
			return 'time';
		}

		if (schema.format === 'uri' || schema.format === 'url') {
			return 'url';
		}

		return 'string';
	}

	if (schema.type === 'number' || schema.type === 'integer') {
		return 'number';
	}

	if (schema.type === 'boolean' || schema.type === 'array' || schema.type === 'object') {
		return schema.type;
	}

	return 'string';
}

function convertJsonSchemaToResourceMapperFields(
	schema: JSONSchema7,
	required: string[] = [],
): ResourceMapperField[] {
	const fields: ResourceMapperField[] = [];
	if (schema.type !== 'object' || !schema.properties) {
		return fields;
	}

	for (const [key, propertySchema] of Object.entries(schema.properties)) {
		if (propertySchema === false) {
			continue;
		}

		if (propertySchema === true) {
			fields.push({
				id: key,
				displayName: key,
				defaultMatch: false,
				canBeUsedToMatch: true,
				required: required.includes(key),
				display: true,
				type: 'string', // use string as a "catch all" for any values
			});
			continue;
		}

		const field: ResourceMapperField = {
			id: key,
			displayName: propertySchema.title ?? key,
			defaultMatch: false,
			required: required.includes(key),
			display: true,
			type: jsonSchemaTypeToFieldType(propertySchema),
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

export async function getToolParameters(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const toolId = this.getNodeParameter('tool', 0, {
		extractValue: true,
	}) as string;
	const authentication = this.getNodeParameter('authentication') as McpAuthenticationOption;
	const serverTransport = this.getNodeParameter('serverTransport') as McpServerTransport;
	const endpointUrl = this.getNodeParameter('endpointUrl') as string;
	const node = this.getNode();
	const { headers } = await getAuthHeaders(this, authentication);
	const client = await connectMcpClient({
		serverTransport,
		endpointUrl,
		headers,
		name: node.type,
		version: node.typeVersion,
		onUnauthorized: async (headers) => await tryRefreshOAuth2Token(this, authentication, headers),
	});

	if (!client.ok) {
		throw new NodeOperationError(this.getNode(), 'Could not connect to your MCP server');
	}

	const result = await getAllTools(client.result);
	const tool = result.find((tool) => tool.name === toolId);
	if (!tool) {
		throw new NodeOperationError(this.getNode(), 'Tool not found');
	}

	const requiredFields = Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [];
	const fields = convertJsonSchemaToResourceMapperFields(tool.inputSchema, requiredFields);
	return {
		fields,
	};
}
