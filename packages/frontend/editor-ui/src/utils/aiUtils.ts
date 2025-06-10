import { CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import type { INodeUi, LlmTokenUsageData } from '@/Interface';
import type { IDataObject, INodeExecutionData, NodeConnectionType } from 'n8n-workflow';
import { isObjectEmpty, NodeConnectionTypes } from 'n8n-workflow';

interface MemoryMessage {
	lc: number;
	type: string;
	id: string[];
	kwargs: {
		content: unknown;
		additional_kwargs: Record<string, unknown>;
	};
}
interface LmGeneration {
	text: string;
	message: MemoryMessage;
}

type ExcludedKeys = typeof NodeConnectionTypes.Main | typeof NodeConnectionTypes.AiChain;
type AllowedEndpointType = Exclude<NodeConnectionType, ExcludedKeys>;

const fallbackParser = (execData: IDataObject) => ({
	type: 'json' as 'json' | 'text' | 'markdown',
	data: execData,
	parsed: false,
});

const outputTypeParsers: {
	[key in AllowedEndpointType]: (execData: IDataObject) => {
		type: 'json' | 'text' | 'markdown';
		data: unknown;
		parsed: boolean;
	};
} = {
	[NodeConnectionTypes.AiLanguageModel](execData: IDataObject) {
		const response = (execData.response as IDataObject) ?? execData;
		if (!response) throw new Error('No response from Language Model');

		// Simple LLM output — single string message item
		if (
			Array.isArray(response?.messages) &&
			response?.messages.length === 1 &&
			typeof response?.messages[0] === 'string'
		) {
			return {
				type: 'text',
				data: response.messages[0],
				parsed: true,
			};
		}

		// Use the memory parser if the response is a memory-like(chat) object
		if (response.messages && Array.isArray(response.messages)) {
			return outputTypeParsers[NodeConnectionTypes.AiMemory](execData);
		}

		if (response.generations) {
			const generations = response.generations as LmGeneration[];

			const content = generations.map((generation) => {
				if (generation?.text) return generation.text;

				if (Array.isArray(generation)) {
					return generation
						.map((item: LmGeneration) => item.text ?? item)
						.join('\n\n')
						.trim();
				}

				return generation;
			});

			return {
				type: 'json',
				data: content,
				parsed: true,
			};
		}

		return {
			type: 'json',
			data: response,
			parsed: true,
		};
	},
	[NodeConnectionTypes.AiTool]: fallbackParser,
	[NodeConnectionTypes.AiAgent]: fallbackParser,
	[NodeConnectionTypes.AiMemory](execData: IDataObject) {
		const chatHistory =
			execData.chatHistory ??
			execData.messages ??
			(execData?.response as IDataObject)?.chat_history;
		if (Array.isArray(chatHistory)) {
			const responseText = chatHistory
				.map((content: MemoryMessage) => {
					if (
						content.type === 'constructor' &&
						content.id?.includes('messages') &&
						content.kwargs
					) {
						interface MessageContent {
							type: string;
							text?: string;
							image_url?:
								| {
										url: string;
								  }
								| string;
						}
						let message = String(content.kwargs.content);
						if (Array.isArray(message)) {
							message = (message as MessageContent[])
								.map((item) => {
									const { type, image_url } = item;
									if (
										type === 'image_url' &&
										typeof image_url === 'object' &&
										typeof image_url.url === 'string'
									) {
										return `![Input image](${image_url.url})`;
									} else if (typeof image_url === 'string') {
										return `![Input image](${image_url})`;
									}
									return item.text;
								})
								.join('\n');
						}
						if (Object.keys(content.kwargs.additional_kwargs).length) {
							message += ` (${JSON.stringify(content.kwargs.additional_kwargs)})`;
						}
						if (content.id.includes('HumanMessage')) {
							message = `**Human:** ${String(message).trim()}`;
						} else if (content.id.includes('AIMessage')) {
							message = `**AI:** ${message}`;
						} else if (content.id.includes('SystemMessage')) {
							message = `**System Message:** ${message}`;
						}

						return message;
					}
					return '';
				})
				.join('\n\n');

			if (responseText.length === 0) {
				return fallbackParser(execData);
			}
			return {
				type: 'markdown',
				data: responseText,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionTypes.AiOutputParser]: fallbackParser,
	[NodeConnectionTypes.AiRetriever]: fallbackParser,
	[NodeConnectionTypes.AiReranker]: fallbackParser,
	[NodeConnectionTypes.AiVectorStore](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionTypes.AiEmbedding](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionTypes.AiDocument](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionTypes.AiTextSplitter](execData: IDataObject) {
		const arrayData = Array.isArray(execData.response)
			? execData.response
			: [execData.textSplitter];
		return {
			type: 'text',
			data: arrayData.join('\n\n'),
			parsed: true,
		};
	},
};

export type ParsedAiContent = Array<{
	raw: IDataObject | IDataObject[];
	parsedContent: {
		type: 'json' | 'text' | 'markdown';
		data: unknown;
		parsed: boolean;
	} | null;
}>;

export function parseAiContent(
	executionData: INodeExecutionData[],
	endpointType: NodeConnectionType,
) {
	if (
		([NodeConnectionTypes.AiChain, NodeConnectionTypes.Main] as NodeConnectionType[]).includes(
			endpointType,
		)
	) {
		return executionData.map((data) => ({ raw: data.json, parsedContent: null }));
	}

	const contentJson = executionData.map((node) => {
		const hasBinaryData = !isObjectEmpty(node.binary);
		return hasBinaryData ? node.binary : node.json;
	});

	const parser = outputTypeParsers[endpointType as AllowedEndpointType];
	if (!parser)
		return [
			{
				raw: contentJson.filter((item): item is IDataObject => item !== undefined),
				parsedContent: null,
			},
		];

	return contentJson
		.filter((c): c is IDataObject => c !== undefined)
		.map((c) => ({ raw: c, parsedContent: parser(c) }));
}

export const emptyTokenUsageData: LlmTokenUsageData = {
	completionTokens: 0,
	promptTokens: 0,
	totalTokens: 0,
	isEstimate: false,
};

export function addTokenUsageData(
	one: LlmTokenUsageData,
	another: LlmTokenUsageData,
): LlmTokenUsageData {
	return {
		completionTokens: one.completionTokens + another.completionTokens,
		promptTokens: one.promptTokens + another.promptTokens,
		totalTokens: one.totalTokens + another.totalTokens,
		isEstimate: one.isEstimate || another.isEstimate,
	};
}

export function formatTokenUsageCount(
	usage: LlmTokenUsageData,
	field: 'total' | 'prompt' | 'completion',
) {
	const count =
		field === 'total'
			? usage.totalTokens
			: field === 'completion'
				? usage.completionTokens
				: usage.promptTokens;

	return usage.isEstimate ? `~${count}` : count.toLocaleString();
}

export function isChatNode(node: INodeUi) {
	return [CHAT_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_NODE_TYPE].includes(node.type);
}
