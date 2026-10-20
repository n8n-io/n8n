import type { ToolCall } from '@ai-sdk/provider-utils';
import type { InvalidToolInputError, NoSuchToolError, ToolCallRepairFunction, ToolSet } from 'ai';

import type { BuiltTool } from '../../types';
import { isZodSchema } from '../../utils/zod';

const isZodEmptyObject = (schema: unknown) => {
	if (!isZodSchema(schema)) return false;
	const typeName = (schema._def as { typeName?: string }).typeName;
	const shape = 'shape' in schema && typeName === 'ZodObject' ? schema.shape : undefined;
	if (typeof shape === 'object' && shape !== null && Object.keys(shape).length === 0) {
		return true;
	}
	return false;
};

const isEmptyInputError = (tool: BuiltTool, toolCall: ToolCall<string, unknown>) => {
	const isNullInput = toolCall.input === 'null' || toolCall.input === null;
	const isEmtpyInputError = isZodEmptyObject(tool.inputSchema) && isNullInput;
	return isEmtpyInputError && isNullInput;
};

export const fixToolCall = async (
	options: {
		toolCall: ToolCall<string, unknown>;
		error: NoSuchToolError | InvalidToolInputError;
	},
	toolMap: Map<string, BuiltTool>,
	// eslint-disable-next-line @typescript-eslint/require-await
): ReturnType<ToolCallRepairFunction<NoInfer<ToolSet>>> => {
	const tool = toolMap.get(options.toolCall.toolName);
	if (!tool || options.toolCall.providerExecuted) return null;

	// The tool map also registers former tool names. A model can still call a
	// tool by a former name, for example after it reads an older conversation.
	const isNoSuchToolError = options.error.name === 'AI_NoSuchToolError';
	if (isNoSuchToolError && tool.name !== options.toolCall.toolName) {
		const { input } = options.toolCall;
		return {
			type: 'tool-call' as const,
			toolCallId: options.toolCall.toolCallId,
			toolName: tool.name,
			input: typeof input === 'string' ? input : JSON.stringify(input ?? {}),
			providerExecuted: false,
			dynamic: options.toolCall.dynamic,
		};
	}

	const isInvalidToolInputError = options.error.name === 'AI_InvalidToolInputError';
	if (!isInvalidToolInputError) return null;

	if (isEmptyInputError(tool, options.toolCall)) {
		return {
			type: 'tool-call' as const,
			toolCallId: options.toolCall.toolCallId,
			toolName: options.toolCall.toolName,
			input: '{}',
			providerExecuted: false,
			dynamic: options.toolCall.dynamic,
		};
	}
	return null;
};
