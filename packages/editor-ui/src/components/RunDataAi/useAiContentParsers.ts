import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { isObjectEmpty, NodeConnectionType } from 'n8n-workflow';

interface MemoryMessage {
	lc: number;
	type: string;
	id: string[];
	kwargs: {
		content: string;
		additional_kwargs: Record<string, unknown>;
	};
}
interface LmGeneration {
	text: string;
	message: MemoryMessage;
}

type ExcludedKeys = NodeConnectionType.Main | NodeConnectionType.AiChain;
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
	[NodeConnectionType.AiLanguageModel](execData: IDataObject) {
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
			return outputTypeParsers[NodeConnectionType.AiMemory](execData);
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
	[NodeConnectionType.AiTool]: fallbackParser,
	[NodeConnectionType.AiMemory](execData: IDataObject) {
		const chatHistory =
			execData.chatHistory ?? execData.messages ?? execData?.response?.chat_history;
		if (Array.isArray(chatHistory)) {
			const responseText = chatHistory
				.map((content: MemoryMessage) => {
					if (content.type === 'constructor' && content.id?.includes('schema') && content.kwargs) {
						let message = content.kwargs.content;
						if (Object.keys(content.kwargs.additional_kwargs).length) {
							message += ` (${JSON.stringify(content.kwargs.additional_kwargs)})`;
						}
						if (content.id.includes('HumanMessage')) {
							message = `**Human:** ${message.trim()}`;
						} else if (content.id.includes('AIMessage')) {
							message = `**AI:** ${message}`;
						} else if (content.id.includes('SystemMessage')) {
							message = `**System Message:** ${message}`;
						}
						if (execData.action && execData.action !== 'getMessages') {
							message = `## Action: ${execData.action}\n\n${message}`;
						}

						return message;
					}
					return '';
				})
				.join('\n\n');

			return {
				type: 'markdown',
				data: responseText,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionType.AiOutputParser]: fallbackParser,
	[NodeConnectionType.AiRetriever]: fallbackParser,
	[NodeConnectionType.AiVectorRetriever]: fallbackParser,
	[NodeConnectionType.AiVectorStore](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionType.AiEmbedding](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionType.AiDocument](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
				parsed: true,
			};
		}

		return fallbackParser(execData);
	},
	[NodeConnectionType.AiTextSplitter](execData: IDataObject) {
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

export const useAiContentParsers = () => {
	const parseAiRunData = (
		executionData: INodeExecutionData[],
		endpointType: NodeConnectionType,
	): ParsedAiContent => {
		if ([NodeConnectionType.AiChain, NodeConnectionType.Main].includes(endpointType)) {
			return executionData.map((data) => ({ raw: data.json, parsedContent: null }));
		}

		const contentJson = executionData.map((node) => {
			const hasBinarData = !isObjectEmpty(node.binary);
			return hasBinarData ? node.binary : node.json;
		});

		const parser = outputTypeParsers[endpointType as AllowedEndpointType];
		if (!parser) return [{ raw: contentJson, parsedContent: null }];

		const parsedOutput = contentJson.map((c) => ({ raw: c, parsedContent: parser(c) }));
		return parsedOutput;
	};

	return {
		parseAiRunData,
	};
};
