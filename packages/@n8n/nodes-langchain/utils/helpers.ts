import { NodeHelpers, NodeConnectionType, NodeOperationError, jsonStringify } from 'n8n-workflow';
import type {
	EventNamesAiNodesType,
	IDataObject,
	IExecuteFunctions,
	INodeParameters,
	INodeType,
	IWebhookFunctions,
} from 'n8n-workflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { BaseMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, DynamicTool, type Tool } from '@langchain/core/tools';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import type { BaseChatMemory } from 'langchain/memory';
import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { z } from 'zod';

function hasMethods<T>(obj: unknown, ...methodNames: Array<string | symbol>): obj is T {
	return methodNames.every(
		(methodName) =>
			typeof obj === 'object' &&
			obj !== null &&
			methodName in obj &&
			typeof (obj as Record<string | symbol, unknown>)[methodName] === 'function',
	);
}

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const options = ctx.getNodeParameter('options', itemIndex, {});

	if (options.metadata) {
		const { metadataValues: metadata } = options.metadata as {
			metadataValues: Array<{
				name: string;
				value: string;
			}>;
		};
		if (metadata.length > 0) {
			return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
		}
	}

	if (options.searchFilterJson) {
		return ctx.getNodeParameter('options.searchFilterJson', itemIndex, '', {
			ensureType: 'object',
		}) as Record<string, never>;
	}

	return undefined;
}

export function isBaseChatMemory(obj: unknown) {
	return hasMethods<BaseChatMemory>(obj, 'loadMemoryVariables', 'saveContext');
}

export function isBaseChatMessageHistory(obj: unknown) {
	return hasMethods<BaseChatMessageHistory>(obj, 'getMessages', 'addMessage');
}

export function isChatInstance(model: unknown): model is BaseChatModel {
	const namespace = (model as BaseLLM)?.lc_namespace ?? [];

	return namespace.includes('chat_models');
}

export function isToolsInstance(model: unknown): model is Tool {
	const namespace = (model as Tool)?.lc_namespace ?? [];

	return namespace.includes('tools');
}

export async function getOptionalOutputParsers(
	ctx: IExecuteFunctions,
): Promise<Array<BaseOutputParser<unknown>>> {
	let outputParsers: BaseOutputParser[] = [];

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParsers = (await ctx.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			0,
		)) as BaseOutputParser[];
	}

	return outputParsers;
}

export function getPromptInputByType(options: {
	ctx: IExecuteFunctions;
	i: number;
	promptTypeKey: string;
	inputKey: string;
}) {
	const { ctx, i, promptTypeKey, inputKey } = options;
	const prompt = ctx.getNodeParameter(promptTypeKey, i) as string;

	let input;
	if (prompt === 'auto') {
		input = ctx.evaluateExpression('{{ $json["chatInput"] }}', i) as string;
	} else {
		input = ctx.getNodeParameter(inputKey, i) as string;
	}

	if (input === undefined) {
		throw new NodeOperationError(ctx.getNode(), 'No prompt specified', {
			description:
				"Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
		});
	}

	return input;
}

export function getSessionId(
	ctx: IExecuteFunctions | IWebhookFunctions,
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
					"Provide a key to use as session ID in the 'Key' parameter or use the 'Take from previous node automatically' option to use the session ID from the previous node, e.t. chat trigger node",
				itemIndex,
			});
		}
	}

	return sessionId;
}

export async function logAiEvent(
	executeFunctions: IExecuteFunctions,
	event: EventNamesAiNodesType,
	data?: IDataObject,
) {
	try {
		await executeFunctions.logAiEvent(event, data ? jsonStringify(data) : undefined);
	} catch (error) {
		executeFunctions.logger.debug(`Error logging AI event: ${event}`);
	}
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

type NestedObject = { [key: string]: any };

function encodeDotNotation(key: string): string {
	// __value replace to get complicated params working
	return key.replace(/\./g, '__').replace('__value', '');
}

function decodeDotNotation(key: string): string {
	return key.replace(/__/g, '.');
}

function traverseObject(
	obj: NestedObject,
	path: string[] = [],
	results: Map<string, string> = new Map(),
): Map<string, string> {
	for (const [key, value] of Object.entries(obj)) {
		const currentPath = [...path, key];
		const fullPath = currentPath.join('.');

		if (typeof value === 'string' && value.startsWith("={{ '__PLACEHOLDER")) {
			results.set(encodeDotNotation(fullPath), value);
		} else if (Array.isArray(value)) {
			traverseArray(value, currentPath, results);
		} else if (typeof value === 'object' && value !== null) {
			traverseObject(value, currentPath, results);
		}
	}

	return results;
}

function traverseArray(arr: any[], path: string[], results: Map<string, string>): void {
	arr.forEach((item, index) => {
		const currentPath = [...path, index.toString()];
		const fullPath = currentPath.join('.');

		if (typeof item === 'string' && item.startsWith("={{ '__PLACEHOLDER")) {
			results.set(encodeDotNotation(fullPath), item);
		} else if (Array.isArray(item)) {
			traverseArray(item, currentPath, results);
		} else if (typeof item === 'object' && item !== null) {
			traverseObject(item, currentPath, results);
		}
	});
}

function buildStructureFromMatches(
	baseKey: string,
	matchingKeys: string[],
	values: Record<string, string>,
): any {
	const result: any = {};

	for (const matchingKey of matchingKeys) {
		const decodedKey = decodeDotNotation(matchingKey);
		const remainingPath = decodedKey
			.slice(baseKey.length)
			.split('.')
			.filter((k) => k !== '');
		let current = result;

		for (let i = 0; i < remainingPath.length - 1; i++) {
			if (!(remainingPath[i] in current)) {
				current[remainingPath[i]] = {};
			}
			current = current[remainingPath[i]];
		}

		const lastKey = remainingPath[remainingPath.length - 1];
		current[lastKey ?? matchingKey] = values[matchingKey];
	}

	return Object.keys(result).length === 0 ? values[encodeDotNotation(baseKey)] : result;
}

function extractPlaceholderDescription(value: string): string {
	const match = value.match(/{{ '__PLACEHOLDER:\s*(.+?)\s*' }}/);
	return match ? match[1] : 'No description provided';
}

export function convertNodeToTool(
	node: INodeType,
	ctx: IExecuteFunctions,
	nodeParameters: INodeParameters,
) {
	const placeholderValues = traverseObject(nodeParameters);

	// Generate Zod schema
	const schemaObj: { [key: string]: z.ZodString } = {};
	for (const [key, value] of placeholderValues.entries()) {
		const description = extractPlaceholderDescription(value);

		schemaObj[key] = z.string().describe(description);
	}
	const schema = z.object(schemaObj);

	const toolDescription = ctx.getNodeParameter(
		'toolDescription',
		0,
		node.description.description,
	) as string;

	const tool = new DynamicStructuredTool({
		name: node.description.name,
		description: toolDescription ? toolDescription : node.description.description,
		schema,
		func: async (args: z.infer<typeof schema>) => {
			const originalGetNodeParameter = ctx.getNodeParameter;
			ctx.getNodeParameter = (key: string, index: number, defaultValue?: any, options?: any) => {
				const encodedKey = encodeDotNotation(key);
				// Check if the full key or any more specific key is a placeholder
				const matchingKeys = Array.from(placeholderValues.keys()).filter((k) =>
					k.startsWith(encodedKey),
				);

				if (matchingKeys.length > 0) {
					// If there are matching keys, build the structure using args
					const res = buildStructureFromMatches(encodedKey, matchingKeys, args);
					return res?.[decodeDotNotation(key)] ?? res;
				}

				// If no placeholder is found, use the original function
				return originalGetNodeParameter(key, index, defaultValue, options);
			};

			ctx.addInputData(NodeConnectionType.AiTool, [[{ json: args }]]);
			// @ts-ignore
			const result = await node.execute.call(ctx);
			// @ts-ignore
			const mappedResults = result[0].flatMap((item: any) => item.json);
			ctx.addOutputData(NodeConnectionType.AiTool, 0, [[{ json: { response: mappedResults } }]]);
			return JSON.stringify(mappedResults);
		},
	});

	return tool;
}

export const getConnectedTools = async (ctx: IExecuteFunctions, enforceUniqueNames: boolean) => {
	const connectedTools =
		((await ctx.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[]) || [];

	if (!enforceUniqueNames) return connectedTools;

	const seenNames = new Set<string>();

	for (const tool of connectedTools) {
		if (!(tool instanceof DynamicTool)) continue;

		const { name } = tool;
		if (seenNames.has(name)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`,
			);
		}
		seenNames.add(name);
	}
	const finalTools = [];

	for (const tool of connectedTools) {
		// @ts-ignore
		if (NodeHelpers.isINodeType(tool?.nodeType)) {
			// @ts-ignore
			console.log('tool params', tool.connectedNode.parameters);
			// @ts-ignore
			const convertedNode = convertNodeToTool(
				// @ts-ignore
				tool.nodeType,
				// @ts-ignore
				tool.context,
				// @ts-ignore
				tool.connectedNode.parameters,
			);
			// @ts-ignore
			finalTools.push(convertedNode);
		} else {
			finalTools.push(tool);
		}
	}

	return finalTools;
};
