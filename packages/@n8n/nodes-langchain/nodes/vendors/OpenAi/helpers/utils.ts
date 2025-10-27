import type { BaseMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';
import type { OpenAIClient } from '@langchain/openai';
import type { BufferWindowMemory } from 'langchain/memory';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Copied from langchain(`langchain/src/tools/convert_to_openai.ts`)
// since these functions are not exported

/**
 * Formats a `Tool` instance into a format that is compatible
 * with OpenAI's ChatCompletionFunctions. It uses the `zodToJsonSchema`
 * function to convert the schema of the tool into a JSON
 * schema, which is then used as the parameters for the OpenAI function.
 */
export function formatToOpenAIFunction(
	tool: Tool,
): OpenAIClient.Chat.ChatCompletionCreateParams.Function {
	return {
		name: tool.name,
		description: tool.description,
		parameters: zodToJsonSchema(tool.schema),
	};
}

export function formatToOpenAITool(tool: Tool): OpenAIClient.Chat.ChatCompletionTool {
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

export function formatToOpenAIAssistantTool(tool: Tool): OpenAIClient.Beta.AssistantTool {
	return {
		type: 'function',
		function: {
			name: tool.name,
			description: tool.description,
			parameters: zodToJsonSchema(tool.schema),
		},
	};
}

const requireStrict = (schema: any) => {
	if (!schema.required) {
		return false;
	}
	// when strict:true, Responses API requires `required` to be present and all properties to be included
	if (schema.properties) {
		const propertyNames = Object.keys(schema.properties);
		const somePropertyMissingFromRequired = propertyNames.some(
			(propertyName) => !schema.required.includes(propertyName),
		);
		const requireStrict = !somePropertyMissingFromRequired;
		return requireStrict;
	}
	return false;
};

export function formatToOpenAIResponsesTool(tool: Tool): OpenAIClient.Responses.FunctionTool {
	const schema = zodToJsonSchema(tool.schema) as any;
	const strict = requireStrict(schema);
	return {
		type: 'function',
		name: tool.name,
		parameters: schema,
		strict,
		description: tool.description,
	};
}

export async function getChatMessages(memory: BufferWindowMemory): Promise<BaseMessage[]> {
	return (await memory.loadMemoryVariables({}))[memory.memoryKey] as BaseMessage[];
}
