import type { ChatOllamaInput } from '@langchain/ollama';
import { ChatOllama } from '@langchain/ollama';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	proxyFetch,
	getConnectionHintNoticeField,
} from '@n8n/ai-utilities';
import {
	assertCredentialAllowsUrl,
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { wrapChatModelMessageInput } from '@utils/chatModelMessageWrapper';

import { ollamaModel, ollamaOptions, ollamaDescription } from '../LMOllama/description';

type ChatOllamaClient = ChatOllama['client'];
type NonStreamingChatRequest = Parameters<ChatOllamaClient['chat']>[0];

/**
 * `ChatOllama` always sends `stream: true` to Ollama, so its `streaming` option
 * has no effect. Send `stream: false` and return the single complete response
 * as a one-item iterator, so the SDK keeps handling message conversion and
 * chunk assembly instead of this class reimplementing them.
 */
class NonStreamingChatOllama extends ChatOllama {
	constructor(fields: ChatOllamaInput) {
		super(fields);

		const client = this.client;
		const chat = client.chat.bind(client);

		// `chat` is overloaded on the `stream` literal, so a single function cannot
		// satisfy every overload. The cast is safe: callers only observe the
		// one-item iterator this returns.
		client.chat = (async (request: NonStreamingChatRequest) =>
			chat({ ...request, stream: false }).then(async function* (response) {
				yield response;
			})) as ChatOllamaClient['chat'];
	}
}

export class LmChatOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ollama Chat Model',

		name: 'lmChatOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Ollama',
		defaults: {
			name: 'Ollama Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatollama/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		...ollamaDescription,
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			ollamaModel,
			{
				...ollamaOptions,
				options: [
					...(ollamaOptions.options ?? []),
					{
						displayName: 'Streaming',
						name: 'streaming',
						type: 'boolean',
						default: true,
						description:
							'Whether to stream the response as it is generated. Disable to receive the full response at once.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('ollamaApi');
		const baseUrl = credentials.baseUrl as string;

		assertCredentialAllowsUrl({
			node: this.getNode(),
			credentialData: credentials,
			url: baseUrl,
			surface: 'Ollama',
		});

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ChatOllamaInput;
		const headers = credentials.apiKey
			? {
					Authorization: `Bearer ${credentials.apiKey as string}`,
				}
			: undefined;

		const egressFilter = this.helpers.getSecureEgressFilter();
		const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) =>
			await proxyFetch({ input, init, egressFilter });

		const ModelClass = options.streaming === false ? NonStreamingChatOllama : ChatOllama;
		const model = new ModelClass({
			...options,
			baseUrl,
			model: modelName,
			format: options.format === 'default' ? undefined : options.format,
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
			headers,
			fetch: fetchWithTimeout,
		});

		return {
			response: wrapChatModelMessageInput(model),
		};
	}
}
