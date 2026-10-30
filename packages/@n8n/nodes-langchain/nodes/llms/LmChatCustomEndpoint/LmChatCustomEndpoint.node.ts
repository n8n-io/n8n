import { ChatOpenAI } from '@langchain/openai';
import {
	getConnectionHintNoticeField,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import {
	jsonParse,
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { n8nContextHeaders } from '@utils/custom-model-endpoint/context-headers';
import {
	createCustomModelEndpointConfig,
	CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
	OPENAI_CREDENTIAL,
	pickCredentialType,
} from '@utils/custom-model-endpoint/gateway-config';
import { toHeaderRecord } from '@utils/custom-model-endpoint/headers';
import {
	chatModelOptions,
	modelField,
	requestHeaderFields,
	SEARCH_ALIASES,
} from '@utils/custom-model-endpoint/descriptions';
import { searchModels } from '@utils/custom-model-endpoint/models';

interface Options {
	maxTokens?: number;
	maxCompletionTokens?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	temperature?: number;
	topP?: number;
	seed?: number;
	stop?: string;
	timeout?: number;
	maxRetries?: number;
}

const RETRYABLE = new Set([408, 429]);

function shouldRetry(status: number | undefined): boolean {
	return status !== undefined && (RETRYABLE.has(status) || status >= 500);
}

function modelKwargsFor(
	options: Options,
	extraBody: string,
	itemIndex: number,
): Record<string, unknown> | undefined {
	const kwargs: Record<string, unknown> = {};
	if (options.seed !== undefined) kwargs.seed = options.seed;
	if (options.maxCompletionTokens !== undefined) {
		kwargs.max_completion_tokens = options.maxCompletionTokens;
	}

	if (extraBody.trim()) {
		Object.assign(
			kwargs,
			jsonParse<Record<string, unknown>>(extraBody, {
				errorMessage: `Extra Body on item ${itemIndex} is not valid JSON`,
			}),
		);
	}

	return Object.keys(kwargs).length > 0 ? kwargs : undefined;
}

export class LmChatCustomEndpoint implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Custom Endpoint Chat Model',
		name: 'lmChatCustomEndpoint',
		icon: {
			light: 'file:../../shared/icons/customModelEndpoint.svg',
			dark: 'file:../../shared/icons/customModelEndpoint.dark.svg',
		},
		group: ['transform'],
		version: [1],
		description: 'Chat with any OpenAI-compatible endpoint, such as a gateway or a proxy',
		defaults: {
			name: 'Custom Endpoint Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			alias: SEARCH_ALIASES,
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatcustomendpoint/',
					},
				],
			},
		},

		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{ name: CUSTOM_MODEL_ENDPOINT_CREDENTIAL, required: false },
			{ name: OPENAI_CREDENTIAL, required: false },
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			modelField,
			...requestHeaderFields,
			chatModelOptions,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentialType = pickCredentialType(this.getNode());
		const credential = await this.getCredentials(credentialType);

		const model = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as Options;
		const sendContextHeaders = this.getNodeParameter(
			'sendContextHeaders',
			itemIndex,
			true,
		) as boolean;
		const headerRows = this.getNodeParameter('headers.header', itemIndex, []) as IDataObject[];
		const extraBody = this.getNodeParameter('extraBody', itemIndex, '') as string;

		const requestHeaders = {
			...(sendContextHeaders ? n8nContextHeaders(this) : {}),
			...toHeaderRecord(
				Object.fromEntries(headerRows.map(({ name, value }) => [String(name ?? ''), value])),
			),
		};

		const { configuration } = createCustomModelEndpointConfig(this, credential, {
			credentialType,
			timeout: options.timeout,
			requestHeaders,
		});

		return {
			response: new ChatOpenAI({
				// The fetch strips this: a gateway reading its key elsewhere must not see it
				apiKey: 'custom-model-endpoint',
				model,
				configuration,
				maxTokens: options.maxTokens,
				frequencyPenalty: options.frequencyPenalty,
				presencePenalty: options.presencePenalty,
				temperature: options.temperature,
				topP: options.topP,
				stop: options.stop ? options.stop.split(',').map((item) => item.trim()) : undefined,
				timeout: options.timeout,
				maxRetries: options.maxRetries ?? 2,
				modelKwargs: modelKwargsFor(options, extraBody, itemIndex),
				callbacks: [new N8nLlmTracing(this)],
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, (error: unknown) => {
					const status = (error as { status?: number }).status;
					if (!shouldRetry(status)) throw error;
				}),
			}),
		};
	}
}
