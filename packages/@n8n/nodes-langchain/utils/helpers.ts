import type { BaseMessage } from '@langchain/core/messages';
import { type DynamicStructuredTool, type StructuredTool, Tool } from '@langchain/core/tools';
import type { JSONSchema7 } from 'json-schema';
import { StructuredToolkit, type SupplyDataToolResponse } from 'n8n-core';
import type { IExecuteFunctions, ISupplyDataFunctions, IWebhookFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ZodType } from 'zod';

import { N8nTool } from './N8nTool';
import { convertJsonSchemaToZod } from './schemaParsing';

export function getPromptInputByType(options: {
	ctx: IExecuteFunctions | ISupplyDataFunctions;
	i: number;
	promptTypeKey: string;
	inputKey: string;
}) {
	const { ctx, i, promptTypeKey, inputKey } = options;
	const promptType = ctx.getNodeParameter(promptTypeKey, i, 'define') as string;

	let input;
	if (promptType === 'auto') {
		input = ctx.evaluateExpression('{{ $json["chatInput"] }}', i) as string;
	} else if (promptType === 'guardrails') {
		input = ctx.evaluateExpression('{{ $json["guardrailsInput"] }}', i) as string;
	} else {
		input = ctx.getNodeParameter(inputKey, i) as string;
	}

	if (input === undefined) {
		if (promptType === 'auto' || promptType === 'guardrails') {
			const key = promptType === 'auto' ? 'chatInput' : 'guardrailsInput';
			throw new NodeOperationError(ctx.getNode(), 'No prompt specified', {
				description: `Expected to find the prompt in an input field called '${key}' (this is what the ${promptType === 'auto' ? 'chat trigger node' : 'guardrails node'} node outputs). To use something else, change the 'Prompt' parameter`,
			});
		} else {
			throw new NodeOperationError(ctx.getNode(), 'No prompt specified', {
				description:
					'The prompt field is empty or the expression used could not be resolved. Please check the configured prompt value.',
			});
		}
	}

	return input;
}

export function getSessionId(
	ctx: ISupplyDataFunctions | IWebhookFunctions,
	itemIndex: number,
	selectorKey = 'sessionIdType',
	autoSelect = 'fromInput',
	customKey = 'sessionKey',
) {
	let sessionId = '';
	const selectorType = ctx.getNodeParameter(selectorKey, itemIndex) as string;

	if (selectorType === autoSelect) {
		// If memory node is used in webhook like node(like chat trigger node), it doesn't have access to evaluateExpression
		// so we try to extract sessionId from the bodyData
		if ('getBodyData' in ctx) {
			const bodyData = ctx.getBodyData() ?? {};
			sessionId = bodyData.sessionId as string;
		} else {
			sessionId = ctx.evaluateExpression('{{ $json.sessionId }}', itemIndex) as string;

			// try to get sessionId from chat trigger
			if (!sessionId || sessionId === undefined) {
				try {
					const chatTrigger = ctx.getChatTrigger();

					if (chatTrigger) {
						sessionId = ctx.evaluateExpression(
							`{{ $('${chatTrigger.name}').first().json.sessionId }}`,
							itemIndex,
						) as string;
					}
				} catch (error) {}
			}
		}

		if (sessionId === '' || sessionId === undefined) {
			throw new NodeOperationError(ctx.getNode(), 'No session ID found', {
				description:
					"Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter",
				itemIndex,
			});
		}
	} else {
		sessionId = ctx.getNodeParameter(customKey, itemIndex, '') as string;
		if (sessionId === '' || sessionId === undefined) {
			throw new NodeOperationError(ctx.getNode(), 'Key parameter is empty', {
				description:
					"Provide a key to use as session ID in the 'Key' parameter or use the 'Connected Chat Trigger Node' option to use the session ID from your Chat Trigger",
				itemIndex,
			});
		}
	}

	return sessionId;
}

export function serializeChatHistory(chatHistory: BaseMessage[]): string {
	return chatHistory
		.map((chatMessage) => {
			if (chatMessage._getType() === 'human') {
				return `Human: ${chatMessage.content}`;
			} else if (chatMessage._getType() === 'ai') {
				return `Assistant: ${chatMessage.content}`;
			} else {
				return `${chatMessage.content}`;
			}
		})
		.join('\n');
}

export function escapeSingleCurlyBrackets(text?: string): string | undefined {
	if (text === undefined) return undefined;

	let result = text;

	result = result
		// First handle triple brackets to avoid interference with double brackets
		.replace(/(?<!{){{{(?!{)/g, '{{{{')
		.replace(/(?<!})}}}(?!})/g, '}}}}')
		// Then handle single brackets, but only if they're not part of double brackets
		// Convert single { to {{ if it's not already part of {{ or {{{
		.replace(/(?<!{){(?!{)/g, '{{')
		// Convert single } to }} if it's not already part of }} or }}}
		.replace(/(?<!})}(?!})/g, '}}');

	return result;
}

/* Convert tools with json schema to tools with zod schema and type Tool
 * Most nodes expect tools to have a Zod schema and have Tool type, do this conversion to make sure all tools are compatible
 */
const normalizeToolSchema = (tool: Tool | DynamicStructuredTool | StructuredTool) => {
	if (tool instanceof Tool) {
		return tool;
	}
	const isZodObject = tool.schema instanceof ZodType;
	if (tool.schema && !isZodObject) {
		tool.schema = convertJsonSchemaToZod(tool.schema as JSONSchema7);
	}

	return tool as Tool;
};

export const getConnectedTools = async (
	ctx: IExecuteFunctions | IWebhookFunctions | ISupplyDataFunctions,
	enforceUniqueNames: boolean,
	convertStructuredTool: boolean = true,
	escapeCurlyBrackets: boolean = false,
): Promise<Tool[]> => {
	const toolkitConnections = (await ctx.getInputConnectionData(
		NodeConnectionTypes.AiTool,
		0,
	)) as SupplyDataToolResponse[];

	// Get parent nodes to map toolkits to their source nodes
	const parentNodes =
		'getParentNodes' in ctx
			? ctx.getParentNodes(ctx.getNode().name, {
					connectionType: NodeConnectionTypes.AiTool,
					depth: 1,
				})
			: [];

	const connectedTools = (toolkitConnections ?? [])
		.flatMap((toolOrToolkit, index) => {
			if (toolOrToolkit instanceof StructuredToolkit) {
				const tools = toolOrToolkit.tools;
				// Add metadata to each tool from the toolkit
				return tools.map((tool) => {
					const sourceNode = parentNodes[index] ?? tool.name;

					tool.metadata ??= {};
					tool.metadata.isFromToolkit = true;
					tool.metadata.sourceNodeName = sourceNode?.name;
					return tool;
				});
			} else {
				const sourceNode = parentNodes[index] ?? toolOrToolkit.name;
				toolOrToolkit.metadata ??= {};
				toolOrToolkit.metadata.isFromToolkit = false;
				toolOrToolkit.metadata.sourceNodeName = sourceNode?.name;
			}

			return toolOrToolkit;
		})
		.map(normalizeToolSchema);

	if (!enforceUniqueNames) return connectedTools;

	const seenNames = new Set<string>();

	const finalTools: Tool[] = [];

	for (const tool of connectedTools) {
		const { name } = tool;
		if (seenNames.has(name)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`,
			);
		}
		seenNames.add(name);

		if (escapeCurlyBrackets) {
			tool.description = escapeSingleCurlyBrackets(tool.description) ?? tool.description;
		}

		if (convertStructuredTool && tool instanceof N8nTool) {
			finalTools.push(tool.asDynamicTool());
		} else {
			finalTools.push(tool);
		}
	}

	return finalTools;
};

/**
 * Sometimes model output is wrapped in an additional object property.
 * This function unwraps the output if it is in the format { output: { output: { ... } } }
 */
export function unwrapNestedOutput(output: Record<string, unknown>): Record<string, unknown> {
	if (
		'output' in output &&
		Object.keys(output).length === 1 &&
		typeof output.output === 'object' &&
		output.output !== null &&
		'output' in output.output &&
		Object.keys(output.output).length === 1
	) {
		return output.output as Record<string, unknown>;
	}

	return output;
}

/**
 * Detects if a text contains a character that repeats sequentially for a specified threshold.
 * This is used to prevent performance issues with tiktoken on highly repetitive content.
 * @param text The text to check
 * @param threshold The minimum number of sequential repeats to detect (default: 1000)
 * @returns true if a character repeats sequentially for at least the threshold amount
 */
export function hasLongSequentialRepeat(text: string, threshold = 1000): boolean {
	try {
		// Validate inputs
		if (
			text === null ||
			typeof text !== 'string' ||
			text.length === 0 ||
			threshold <= 0 ||
			text.length < threshold
		) {
			return false;
		}
		// Use string iterator to avoid creating array copy (memory efficient)
		const iterator = text[Symbol.iterator]();
		let prev = iterator.next();

		if (prev.done) {
			return false;
		}

		let count = 1;
		for (const char of iterator) {
			if (char === prev.value) {
				count++;
				if (count >= threshold) {
					return true;
				}
			} else {
				count = 1;
				prev = { value: char, done: false };
			}
		}

		return false;
	} catch (error) {
		// On any error, return false to allow normal processing
		return false;
	}
}
