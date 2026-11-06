import { OpenAI } from 'openai';
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from 'openai/resources';
import {
	accumulateTokenUsage,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { actionNodeOptions, messagesField } from './descriptions';
import { parseExtraBody } from '../../llms/shared/extra-body';

import { n8nContextHeaders } from '@utils/custom-model-endpoint/context-headers';
import {
	modelField,
	requestHeaderFields,
	SEARCH_ALIASES,
} from '@utils/custom-model-endpoint/descriptions';
import {
	createCustomModelEndpointConfig,
	CUSTOM_MODEL_ENDPOINT_CREDENTIAL,
	OPENAI_CREDENTIAL,
	pickCredentialType,
} from '@utils/custom-model-endpoint/gateway-config';
import { toHeaderRecord } from '@utils/custom-model-endpoint/headers';
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
}

interface MessageRow {
	role?: string;
	content?: string;
}

/** The token fields default to -1, which a gateway would read as a real limit. */
function limitOrUnset(value: number | undefined): number | undefined {
	return value !== undefined && value > 0 ? value : undefined;
}

/**
 * A gateway can answer with a partial or malformed `usage` block. `accumulateTokenUsage`
 * adds with `??`, so a non-number would store `NaN` and poison every later total in the
 * same execution.
 */
const asTokenCount = (value: unknown): number | undefined =>
	typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

function reportTokenUsage(ctx: IExecuteFunctions, usage: ChatCompletion['usage']): void {
	const inputTokens = asTokenCount(usage?.prompt_tokens);
	const outputTokens = asTokenCount(usage?.completion_tokens);
	if (inputTokens === undefined && outputTokens === undefined) return;

	accumulateTokenUsage(ctx, inputTokens ?? 0, outputTokens ?? 0);
}

function messagesFor(
	ctx: IExecuteFunctions,
	itemIndex: number,
): ChatCompletionCreateParamsNonStreaming['messages'] {
	const rows = ctx.getNodeParameter('messages.message', itemIndex, []) as MessageRow[];
	const messages = rows.flatMap(({ role, content }) => {
		const text = content ?? '';
		return text
			? [{ role: (role ?? 'user') as 'system' | 'user' | 'assistant', content: text }]
			: [];
	});

	if (messages.length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'This node has no message to send', {
			itemIndex,
			description: 'Add at least one message with content.',
		});
	}

	return messages;
}

export class CustomModelEndpoint implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Custom Model Endpoint',
		name: 'customModelEndpoint',
		icon: {
			light: 'file:../../shared/icons/customModelEndpoint.svg',
			dark: 'file:../../shared/icons/customModelEndpoint.dark.svg',
		},
		group: ['transform'],
		version: [1],
		description: 'Message a model on any OpenAI-compatible endpoint, such as a gateway or a proxy',
		defaults: {
			name: 'Custom Model Endpoint',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Other AI Nodes'],
			},
			alias: SEARCH_ALIASES,
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.custommodelendpoint/',
					},
				],
			},
		},

		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
			{
				displayName:
					'This node sends one prompt to the endpoint on your credential. Change gateway by editing that credential, not this node.',
				name: 'endpointNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { authentication: [CUSTOM_MODEL_ENDPOINT_CREDENTIAL] } },
			},
			{
				displayName:
					'An OpenAI credential reaches OpenAI itself, or whatever its Base URL overrides it to. Switch to a Custom Model Endpoint credential for a named login header, OAuth2, or gateway headers.',
				name: 'openAiNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { authentication: [OPENAI_CREDENTIAL] } },
			},
			modelField,
			messagesField,
			...requestHeaderFields,
			actionNodeOptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentialType = pickCredentialType(this.getNode());
		const credential = await this.getCredentials(credentialType);

		/**
		 * One client for the whole run, so its connections are reused across items. The
		 * credential, the timeout and the context headers are node-level settings rather
		 * than per-item data; only the user's own headers resolve per item, and those
		 * travel on the request instead of the transport.
		 */
		const runOptions = this.getNodeParameter('options', 0, {}) as Options;
		const sendContextHeaders = this.getNodeParameter('sendContextHeaders', 0, true) as boolean;
		const contextHeaders = sendContextHeaders ? n8nContextHeaders(this) : {};

		/**
		 * The transport resolves this record per request, so rewriting it between items
		 * gives each item its own headers without a second client. It also puts them in
		 * the layer that wins over the credential's gateway headers, which is where the
		 * sub-node puts them. Safe because the loop below is sequential.
		 */
		const requestHeaders: Record<string, string> = { ...contextHeaders };

		const { configuration } = createCustomModelEndpointConfig(this, credential, {
			credentialType,
			timeout: runOptions.timeout,
			requestHeaders,
		});

		const client = new OpenAI({
			...configuration,
			// The fetch strips this: a gateway reading its key elsewhere must not see it
			apiKey: 'custom-model-endpoint',
			maxRetries: 0,
		});

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const model = this.getNodeParameter('model', itemIndex, '', {
					extractValue: true,
				}) as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as Options;
				const extraBody: unknown = this.getNodeParameter('extraBody', itemIndex, '');
				const headerRows = this.getNodeParameter('headers.header', itemIndex, []) as IDataObject[];

				const hasExtraBody =
					typeof extraBody === 'string' ? extraBody.trim() !== '' : Boolean(extraBody);

				const body: ChatCompletionCreateParamsNonStreaming = {
					model,
					messages: messagesFor(this, itemIndex),
					max_tokens: limitOrUnset(options.maxTokens),
					max_completion_tokens: limitOrUnset(options.maxCompletionTokens),
					frequency_penalty: options.frequencyPenalty,
					presence_penalty: options.presencePenalty,
					temperature: options.temperature,
					top_p: options.topP,
					seed: options.seed,
					stop: options.stop ? options.stop.split(',').map((entry) => entry.trim()) : undefined,
					...(hasExtraBody ? parseExtraBody(this, extraBody, itemIndex) : {}),
				};

				for (const key of Object.keys(requestHeaders)) delete requestHeaders[key];
				Object.assign(
					requestHeaders,
					contextHeaders,
					toHeaderRecord(
						Object.fromEntries(
							headerRows.flatMap(({ name, value }) => {
								const headerName = String(name ?? '').trim();
								return headerName ? [[headerName, value]] : [];
							}),
						),
					),
				);

				const response = await client.chat.completions.create(body, {
					signal: this.getExecutionCancelSignal(),
				});

				reportTokenUsage(this, response.usage);

				const choice = response.choices?.[0];
				const toolCalls = choice?.message?.tool_calls;

				returnData.push({
					json: {
						text: choice?.message?.content ?? '',
						finishReason: choice?.finish_reason ?? null,
						...(toolCalls?.length ? { toolCalls } : {}),
						response: response as unknown as IDataObject,
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (!this.continueOnFail()) throw error;

				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: itemIndex },
				});
			}
		}

		return [returnData];
	}
}
