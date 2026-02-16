import type { FunctionDefinition } from '@langchain/core/language_models/base';
import type * as LangchainChatModels from '@langchain/core/language_models/chat_models';
import type * as LangchainTools from '@langchain/core/tools';
import type { JSONSchema7 } from 'json-schema';
import { ZodSchema, type ZodTypeAny } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

import type * as N8nTools from '../types/tool';

/**
 * Convert various tool formats to N8nTool
 */
export function fromLcTool(tool: LangchainChatModels.BindToolsInput): N8nTools.Tool {
	if ('schema' in tool && 'invoke' in tool) {
		const structuredTool = tool as LangchainTools.StructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('schema' in tool && 'func' in tool) {
		const structuredTool = tool as LangchainTools.DynamicStructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('name' in tool && 'schema' in tool) {
		const structuredTool = tool as LangchainTools.StructuredTool;
		return {
			type: 'function',
			name: structuredTool.name,
			description: structuredTool.description,
			inputSchema: structuredTool.schema as JSONSchema7 | ZodTypeAny,
		};
	}
	if ('function' in tool && 'type' in tool && tool.type === 'function') {
		const functionTool = tool.function as FunctionDefinition;
		return {
			type: 'function',
			name: functionTool.name,
			description: functionTool.description,
			inputSchema: functionTool.parameters as JSONSchema7,
		};
	}

	throw new Error(`Unable to convert tool to N8nTool: ${JSON.stringify(tool)}`);
}

export function getParametersJsonSchema(tool: N8nTools.FunctionTool): JSONSchema7 {
	const schema = tool.inputSchema;
	if (schema instanceof ZodSchema) {
		if ('toJSONSchema' in schema && typeof schema.toJSONSchema === 'function') {
			return schema.toJSONSchema();
		}
		return zodToJsonSchema(schema) as JSONSchema7;
	}
	return schema;
}
