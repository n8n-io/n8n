import { EndpointType } from '@/Interface';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

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

type ExcludedKeys = 'main' | 'chain' | 'agent';
type AllowedEndpointType = Exclude<EndpointType, ExcludedKeys>;

const fallbackParser = (execData: IDataObject) => ({
	type: 'json' as 'json' | 'text' | 'markdown',
	data: execData,
});

const outputTypeParsers: {
	[key in AllowedEndpointType]: (execData: IDataObject) => {
		type: 'json' | 'text' | 'markdown';
		data: unknown;
	};
} = {
	[EndpointType.LanguageModel](execData: IDataObject) {
		const response = (execData.response as IDataObject) ?? execData;
		if (!response) throw new Error('No response from Language Model');

		// Use the memory parser if the response is a memory-like(chat) object
		if (response.messages && Array.isArray(response.messages)) {
			return outputTypeParsers.memory(execData);
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
			};
		} else if (
			Array.isArray(response) &&
			response.length === 1 &&
			typeof response[0] === 'string'
		) {
			return {
				type: 'text',
				data: response[0],
			};
		}

		return {
			type: 'json',
			data: response,
		};
	},
	[EndpointType.Tool]: fallbackParser,
	[EndpointType.Memory](execData: IDataObject) {
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
			};
		}

		return fallbackParser(execData);
	},
	[EndpointType.OutputParser]: fallbackParser,
	[EndpointType.VectorRetriever]: fallbackParser,
	[EndpointType.VectorStore](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
			};
		}

		return fallbackParser(execData);
	},
	[EndpointType.Embedding](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
			};
		}

		return fallbackParser(execData);
	},
	[EndpointType.Document](execData: IDataObject) {
		if (execData.documents) {
			return {
				type: 'json',
				data: execData.documents,
			};
		}

		return fallbackParser(execData);
	},
	[EndpointType.TextSplitter](execData: IDataObject) {
		const arrayData = Array.isArray(execData.response)
			? execData.response
			: [execData.textSplitter];
		return {
			type: 'text',
			data: arrayData.join('\n\n'),
		};
	},
};
export type ParsedAiContent = Array<{
	raw: IDataObject | IDataObject[];
	parsedContent: {
		type: 'json' | 'text' | 'markdown';
		data: unknown;
	} | null;
}>;

export const useAiContentParsers = () => {
	const parseAiRunData = (
		executionData: INodeExecutionData[],
		endpointType: EndpointType,
	): ParsedAiContent => {
		if (['chain', 'agent', 'main'].includes(endpointType)) {
			console.log(`Unsupported endpoint type parser ${endpointType}, returning raw data`);
			return executionData.map((data) => ({ raw: data.json, parsedContent: null }));
		}

		const contentJson = executionData.map((node) => node.json);
		const parser = outputTypeParsers[endpointType as AllowedEndpointType];
		if (!parser) return [{ raw: contentJson, parsedContent: null }];

		const parsedOutput = contentJson.map((c) => ({ raw: c, parsedContent: parser(c) }));
		return parsedOutput;
	};

	return {
		parseAiRunData,
	};
};
