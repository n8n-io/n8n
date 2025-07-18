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

export async function getChatMessages(memory: BufferWindowMemory): Promise<BaseMessage[]> {
	return (await memory.loadMemoryVariables({}))[memory.memoryKey] as BaseMessage[];
}
