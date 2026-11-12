import { ChatOpenAI, ChatOpenAICompletions, type ChatOpenAIFields } from '@langchain/openai';
import {
	getConnectionHintNoticeField,
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
} from '@n8n/ai-utilities';
import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { parseExtraBody } from '../shared/extra-body';

import { wrapChatModelMessageInput } from '@utils/chatModelMessageWrapper';
import { n8nContextHeaders } from '@utils/custom-model-endpoint/context-headers';
import {
	createCustomModelEndpointConfig,
	CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
	OPENAI_CREDENTIAL,
	pickCredentialType,
} from '@utils/custom-model-endpoint/gateway-config';
import { toHeaderRecord } from '@utils/custom-model-endpoint/headers';
import {
	apiFormatField,
	chatModelOptions,
	CHAT_COMPLETIONS_FORMAT,
	modelField,
	requestHeaderFields,
	responsesFormatNotice,
	RESPONSES_FORMAT,
	SEARCH_ALIASES,
} from '@utils/custom-model-endpoint/descriptions';
import { searchModels } from '@utils/custom-model-endpoint/models';

interface Options {
	maxTokens?: number;
	maxOutputTokens?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	temperature?: number;
	topP?: number;
	seed?: number;
	stop?: string;
	timeout?: number;
	maxRetries?: number;
	reasoningSummary?: string;
	storeResponse?: boolean;
	truncation?: string;
}

const RETRYABLE = new Set([408, 429]);

function shouldRetry(status: number): boolean {
	return RETRYABLE.has(status) || status >= 500;
}

/** The client spreads these into the body, so each one reaches the gateway as a Responses field. */
function responsesKwargs(options: Options): Record<string, unknown> {
	return {
		...(options.reasoningSummary ? { reasoning: { summary: options.reasoningSummary } } : {}),
		...(options.storeResponse === undefined ? {} : { store: options.storeResponse }),
		...(options.truncation ? { truncation: options.truncation } : {}),
	};
}

function modelKwargsFor(
	ctx: ISupplyDataFunctions,
	options: Options,
	extraBody: unknown,
	itemIndex: number,
	usesResponses: boolean,
): Record<string, unknown> | undefined {
	const kwargs: Record<string, unknown> = usesResponses ? responsesKwargs(options) : {};
	if (!usesResponses && options.seed !== undefined) kwargs.seed = options.seed;

	const hasExtraBody = typeof extraBody === 'string' ? extraBody.trim() !== '' : Boolean(extraBody);
	if (hasExtraBody) Object.assign(kwargs, parseExtraBody(ctx, extraBody, itemIndex));

	return Object.keys(kwargs).length > 0 ? kwargs : undefined;
}

/** The fields default to -1, which the gateway would read as a real limit. */
function limitOrUnset(value: number | undefined): number | undefined {
	return value !== undefined && value > 0 ? value : undefined;
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
			{
				name: CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
				required: true,
				displayOptions: { show: { authentication: [CUSTOM_MODEL_ENDPOINT_CREDENTIAL] } },
			},
			{
				name: OPENAI_CREDENTIAL,
				required: true,
				displayOptions: { show: { authentication: [OPENAI_CREDENTIAL] } },
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				// The credentials are gated on this, and a credential is attached before a run
				noDataExpression: true,
				options: [
					{ name: 'Custom Model Endpoint', value: CUSTOM_MODEL_ENDPOINT_CREDENTIAL },
					{ name: 'OpenAI', value: OPENAI_CREDENTIAL },
				],
				default: CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
			},
			modelField,
			apiFormatField,
			responsesFormatNotice,
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
		const usesResponses =
			this.getNodeParameter('apiFormat', itemIndex, CHAT_COMPLETIONS_FORMAT) === RESPONSES_FORMAT;
		const sendContextHeaders = this.getNodeParameter(
			'sendContextHeaders',
			itemIndex,
			true,
		) as boolean;
		const headerRows = this.getNodeParameter('headers.header', itemIndex, []) as IDataObject[];
		const extraBody: unknown = this.getNodeParameter('extraBody', itemIndex, '');

		const requestHeaders = {
			...(sendContextHeaders ? n8nContextHeaders(this) : {}),
			...toHeaderRecord(
				Object.fromEntries(
					headerRows.flatMap(({ name, value }) => {
						const headerName = String(name ?? '').trim();
						return headerName ? [[headerName, value]] : [];
					}),
				),
			),
		};

		const { configuration } = createCustomModelEndpointConfig(this, credential, {
			credentialType,
			timeout: options.timeout,
			requestHeaders,
		});

		const fields: ChatOpenAIFields = {
			// The fetch strips this: a gateway reading its key elsewhere must not see it
			apiKey: 'custom-model-endpoint',
			model,
			configuration,
			maxTokens: limitOrUnset(usesResponses ? options.maxOutputTokens : options.maxTokens),
			temperature: options.temperature,
			topP: options.topP,
			timeout: options.timeout,
			maxRetries: options.maxRetries ?? 2,
			modelKwargs: modelKwargsFor(this, options, extraBody, itemIndex, usesResponses),
			callbacks: [new N8nLlmTracing(this)],
			onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, (error: unknown) => {
				const { status } = error as { status?: number };
				// A connection error or a timeout carries no status, and the default
				// handler already knows which of those are worth another attempt
				if (status !== undefined && !shouldRetry(status)) throw error;
			}),
			...(usesResponses
				? {}
				: {
						frequencyPenalty: options.frequencyPenalty,
						presencePenalty: options.presencePenalty,
						stop: options.stop ? options.stop.split(',').map((item) => item.trim()) : undefined,
					}),
		};

		// The Agent reads `useResponsesApi` off ChatOpenAI to tell the two protocols apart
		if (usesResponses) return { response: new ChatOpenAI({ ...fields, useResponsesApi: true }) };

		// The protocol-specific client, so an opaque gateway model ID cannot pick the API instead
		return { response: wrapChatModelMessageInput(new ChatOpenAICompletions(fields)) };
	}
}
