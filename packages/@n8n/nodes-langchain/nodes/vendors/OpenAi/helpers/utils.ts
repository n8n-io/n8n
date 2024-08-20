import { zodToJsonSchema } from 'zod-to-json-schema';
import type { OpenAIClient } from '@langchain/openai';
import type { StructuredTool } from '@langchain/core/tools';

// Copied from langchain(`langchain/src/tools/convert_to_openai.ts`)
// since these functions are not exported

/**
 * Formats a `StructuredTool` instance into a format that is compatible
 * with OpenAI's ChatCompletionFunctions. It uses the `zodToJsonSchema`
 * function to convert the schema of the `StructuredTool` into a JSON
 * schema, which is then used as the parameters for the OpenAI function.
 */
export function formatToOpenAIFunction(
	tool: StructuredTool,
): OpenAIClient.Chat.ChatCompletionCreateParams.Function {
	return {
		name: tool.name,
		description: tool.description,
		parameters: zodToJsonSchema(tool.schema),
	};
}

export function formatToOpenAITool(tool: StructuredTool): OpenAIClient.Chat.ChatCompletionTool {
	const schema = zodToJsonSchema(tool.schema);
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: schema,
		},
	};
}

export function formatToOpenAIAssistantTool(tool: StructuredTool): OpenAIClient.Beta.AssistantTool {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: zodToJsonSchema(tool.schema),
		},
	};
}
