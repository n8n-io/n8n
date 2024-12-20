/* eslint-disable n8n-nodes-base/node-dirname-against-convention */

import { Ollama } from '@langchain/community/llms/ollama';
import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { ollamaDescription, ollamaModel, ollamaOptions } from './description';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { CallbackHandler } from 'langfuse-langchain';

export class LmOllama implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ollama Model',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'lmOllama',
		icon: 'file:ollama.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model Ollama',
		defaults: {
			name: 'Ollama Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Text Completion Models'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmollama/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiLanguageModel],
		outputNames: ['Model'],
		...ollamaDescription,
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
			ollamaModel,
			ollamaOptions,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('ollamaApi');

		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as object;

		const { langfuse } = options as {
			langfuse?: {
				baseUrl: string;
				publicKey: string;
				secretKey: string;
			};
		};

		const langfuseHandler = new CallbackHandler({
			sessionId: this.getExecutionId(),
			publicKey: langfuse?.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY,
			secretKey: langfuse?.secretKey ?? process.env.LANGFUSE_SECRET_KEY,
			baseUrl: langfuse?.baseUrl ?? process.env.LANGFUSE_HOST,
		});

		const model = new Ollama({
			baseUrl: credentials.baseUrl as string,
			model: modelName,
			...options,
			callbacks: [new N8nLlmTracing(this), langfuseHandler],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this),
		});

		return {
			response: model,
		};
	}
}
