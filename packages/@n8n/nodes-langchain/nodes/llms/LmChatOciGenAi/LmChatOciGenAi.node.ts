import { getConnectionHintNoticeField } from '@n8n/ai-utilities';
import type { OciGenAiGenericChat as OciGenAiGenericChatType } from '@oracle/langchain-oci';
import {
	NodeConnectionTypes,
	NodeOperationError,
	UserError,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type { models as ociInferenceModels } from 'oci-generativeaiinference';

import {
	createOciGenAiClient,
	getCachedOciGenAiModelCatalogPage,
	isOciGenAiCredentials,
	loadOciSdk,
	validateOciCompartmentId,
	validateOciModelId,
	validateOciVendor,
} from '../../../utils/ociGenAi';

const DEFAULT_MODEL = 'meta.llama-3.3-70b-instruct';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_REQUEST_TIMEOUT = 60000;

type ResourceLocatorValue = {
	mode: string;
	value: string;
};

type OciChatRequestParams = {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	topK?: number;
	seed?: number;
};

type OciGenAiChatConstructor = new (
	params: ConstructorParameters<typeof OciGenAiGenericChatType>[0] & {
		defaultRequestParams?: OciChatRequestParams;
	},
) => OciGenAiGenericChatType;

function isResourceLocatorValue(value: unknown): value is ResourceLocatorValue {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return typeof candidate.mode === 'string' && typeof candidate.value === 'string';
}

function getModelId(value: unknown): string {
	if (isResourceLocatorValue(value)) {
		return validateOciModelId(value.value);
	}
	if (typeof value === 'string') {
		return validateOciModelId(value);
	}
	throw new UserError('Invalid chat model value');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeOciToolSchema(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sanitizeOciToolSchema);
	}

	if (!isRecord(value)) {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			// OCI's function-declaration schema rejects LangChain's optional $schema keyword.
			.filter(([key]) => key !== '$schema')
			.map(([key, nestedValue]) => [key, sanitizeOciToolSchema(nestedValue)]),
	);
}

function sanitizeOciToolDefinitions(
	tools: ociInferenceModels.FunctionDefinition[] | undefined,
): ociInferenceModels.FunctionDefinition[] | undefined {
	return tools?.map((tool) => ({
		...tool,
		...(tool.parameters === undefined
			? {}
			: { parameters: sanitizeOciToolSchema(tool.parameters) }),
	}));
}

export function normalizeEmptyOciToolCallContent(
	messages: Parameters<OciGenAiGenericChatType['_prepareRequest']>[0],
) {
	return messages.map((message) => {
		// n8n tool agents can represent an otherwise valid AI tool call with content: [].
		// OCI accepts the tool call but rejects the empty array, so retain its metadata and use an empty string.
		if (
			Array.isArray(message.content) &&
			message.content.length === 0 &&
			isRecord(message) &&
			Array.isArray(message.tool_calls) &&
			message.tool_calls.length > 0
		) {
			const normalizedMessage = Object.create(Object.getPrototypeOf(message));
			Object.assign(normalizedMessage, message, { content: '' });
			return normalizedMessage;
		}

		return message;
	});
}

/**
 * Keep this as a chat-model subclass rather than returning model.bind(...).
 *
 * Calling bind() returns a RunnableBinding wrapper. That wrapper can obscure
 * chat-model-specific capabilities such as bindTools() from downstream n8n
 * agent code, which then has to unwrap the binding to recover the underlying
 * BaseChatModel.
 *
 * By subclassing OciGenAiGenericChat and injecting request defaults in
 * _createRequest(), the returned object remains a native chat model while
 * still applying the node-level defaults.
 */
/** Creates the request-normalizing wrapper only when n8n supplies the OCI chat model. */
export async function createN8nOciGenAiGenericChat(): Promise<OciGenAiChatConstructor> {
	// The lazy-loaded CJS module and its type-only ESM declaration otherwise expose
	// separate LangChain class identities to TypeScript.
	const { langchainOci } = await loadOciSdk();
	const { OciGenAiGenericChat } = langchainOci as unknown as {
		OciGenAiGenericChat: typeof OciGenAiGenericChatType;
	};
	return class N8nOciGenAiGenericChat extends OciGenAiGenericChat {
		private readonly defaultRequestParams: OciChatRequestParams;

		constructor(
			params: ConstructorParameters<typeof OciGenAiGenericChat>[0] & {
				defaultRequestParams?: OciChatRequestParams;
			},
		) {
			super(params);
			this.defaultRequestParams = params.defaultRequestParams ?? {};
		}

		override _prepareRequest(
			messages: Parameters<InstanceType<typeof OciGenAiGenericChat>['_prepareRequest']>[0],
			options: Parameters<InstanceType<typeof OciGenAiGenericChat>['_prepareRequest']>[1],
			stream?: boolean,
		) {
			return super._prepareRequest(normalizeEmptyOciToolCallContent(messages), options, stream);
		}

		override _createRequest(
			messages: Parameters<InstanceType<typeof OciGenAiGenericChat>['_createRequest']>[0],
			options: Parameters<InstanceType<typeof OciGenAiGenericChat>['_createRequest']>[1],
			stream?: boolean,
		) {
			const requestParams = {
				...this.defaultRequestParams,
				...(options.requestParams ?? {}),
			};
			const tools = sanitizeOciToolDefinitions(requestParams.tools);

			return super._createRequest(
				messages,
				{
					...options,
					requestParams: {
						...requestParams,
						...(tools === undefined ? {} : { tools }),
					},
				},
				stream,
			);
		}
	};
}

const modelProperty: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: DEFAULT_MODEL,
	},
	required: true,
	displayOptions: {
		show: {
			servingMode: ['onDemand'],
		},
	},
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a chat model...',
			typeOptions: {
				searchListMethod: 'searchChatModels',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'xai.grok-4.6',
		},
	],
	description:
		'Select a chat model from the OCI catalog, or enter its provider model ID, such as xai.grok-4.6. Do not enter the OCI model OCID.',
};

const compartmentProperty: INodeProperties = {
	displayName: 'Compartment OCID',
	name: 'compartmentId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'ocid1.compartment.oc1..aaaa...',
	description: 'OCID of the compartment authorized to use OCI Generative AI',
};

const vendorProperty: INodeProperties = {
	displayName: 'Vendor',
	name: 'vendor',
	type: 'string',
	default: '',
	displayOptions: {
		show: {
			servingMode: ['onDemand'],
		},
	},
	placeholder: 'Cohere, Meta, Google, OpenAI, or xAI',
	description: 'Optional vendor filter used to narrow the OCI model catalog',
};

const servingModeProperty: INodeProperties = {
	displayName: 'Serving Mode',
	name: 'servingMode',
	type: 'options',
	options: [
		{
			name: 'On Demand',
			value: 'onDemand',
			description: 'Use an OCI Generative AI on-demand model',
		},
		{
			name: 'Dedicated Endpoint',
			value: 'dedicated',
			description: 'Use a model deployed to a dedicated OCI AI endpoint',
		},
	],
	default: 'onDemand',
};

const dedicatedEndpointProperty: INodeProperties = {
	displayName: 'Dedicated Endpoint ID',
	name: 'dedicatedEndpointId',
	type: 'string',
	default: '',
	placeholder: 'ocid1.generativeaidededicatedaiendpoint.oc1...',
	displayOptions: {
		show: {
			servingMode: ['dedicated'],
		},
	},
	description: 'OCID of the dedicated OCI Generative AI endpoint hosting the model',
};

const optionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Temperature',
			name: 'temperature',
			type: 'number',
			default: DEFAULT_TEMPERATURE,
			typeOptions: {
				minValue: 0,
				maxValue: 2,
				numberPrecision: 2,
			},
			description: 'Controls the randomness of generated responses',
		},
		{
			displayName: 'Maximum Tokens',
			name: 'maxTokens',
			type: 'number',
			default: DEFAULT_MAX_TOKENS,
			typeOptions: {
				minValue: 1,
			},
			description: 'Maximum number of tokens generated in the response',
		},
		{
			displayName: 'Top P',
			name: 'topP',
			type: 'number',
			default: DEFAULT_TOP_P,
			typeOptions: {
				minValue: 0,
				maxValue: 1,
				numberPrecision: 2,
			},
			description: 'Controls nucleus sampling',
		},
		{
			displayName: 'Top K',
			name: 'topK',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description:
				'Number of highest-probability tokens considered for generation. Set to 0 to leave unset.',
		},
		{
			displayName: 'Seed',
			name: 'seed',
			type: 'number',
			default: 0,
			typeOptions: {
				minValue: 0,
			},
			description: 'Seed used for reproducible generation where supported by the selected model',
		},
		{
			displayName: 'Timeout',
			name: 'timeout',
			type: 'number',
			default: DEFAULT_REQUEST_TIMEOUT,
			typeOptions: {
				minValue: 1,
			},
			description:
				'Maximum amount of time an OCI request is allowed to take, including retries, in milliseconds',
		},
	],
};

type OciChatOptions = {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	topK?: number;
	seed?: number;
	timeout?: number;
};

export class LmChatOciGenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OCI Generative AI Chat Model',
		name: 'lmChatOciGenAi',
		icon: 'file:../../shared/icons/oracle.svg',
		group: ['transform'],
		version: 1,
		description: 'Use OCI Generative AI chat models with n8n AI chains and agents',
		defaults: {
			name: 'OCI Generative AI Chat Model',
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
						url: 'https://docs.oracle.com/en-us/iaas/Content/generative-ai/home.htm',
					},
				],
			},
		},
		credentials: [
			{
				name: 'ociGenAiApi',
				required: true,
			},
		],
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			modelProperty,
			compartmentProperty,
			vendorProperty,
			servingModeProperty,
			dedicatedEndpointProperty,
			optionsProperty,
		],
	};

	methods = {
		listSearch: {
			async searchChatModels(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				let compartmentId: string;
				try {
					compartmentId = validateOciCompartmentId(
						this.getNodeParameter('compartmentId', '') as string,
					);
				} catch {
					return {
						results: [
							{
								name: 'Enter a Valid Compartment OCID to Load Models',
								value: '',
							},
						],
					};
				}

				const credentials = await this.getCredentials('ociGenAiApi');
				if (!isOciGenAiCredentials(credentials)) {
					throw new NodeOperationError(this.getNode(), 'Invalid OCI Generative AI credentials');
				}
				let vendor: string | undefined;
				try {
					vendor = validateOciVendor(this.getNodeParameter('vendor', '') as string);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error as Error);
				}
				const normalizedFilter = (filter ?? '').trim().toLowerCase();
				let modelId: string | undefined;
				if (normalizedFilter) {
					try {
						modelId = validateOciModelId(normalizedFilter);
					} catch {
						// Non-ID typeahead input continues to use local filtering of the cached catalog.
					}
				}

				const { genai } = await loadOciSdk();
				const response = await getCachedOciGenAiModelCatalogPage(
					credentials,
					{
						compartmentId,
						capability: genai.models.ModelCapability.Chat,
						vendor,
						...(modelId === undefined ? { paginationToken } : { modelId }),
					},
					this.helpers.getSecureEgressFilter(),
				);

				const results: INodeListSearchItems[] = response.searchModels
					.filter((model) => !normalizedFilter || model.searchText.includes(normalizedFilter))
					.map((model) => ({ name: model.name, value: model.id }));

				return {
					results,
					paginationToken: response.nextPage,
				};
			},
		},
	};

	// Build the LangChain chat model that n8n supplies to connected AI nodes.
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('ociGenAiApi');
		if (!isOciGenAiCredentials(credentials)) {
			throw new NodeOperationError(this.getNode(), 'Invalid OCI Generative AI credentials', {
				itemIndex,
			});
		}

		let compartmentId: string;
		try {
			compartmentId = validateOciCompartmentId(
				this.getNodeParameter('compartmentId', itemIndex, '') as string,
			);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
		}

		const servingMode = this.getNodeParameter('servingMode', itemIndex, 'onDemand') as
			| 'onDemand'
			| 'dedicated';

		let model: string | undefined;
		let dedicatedEndpointId: string | undefined;
		if (servingMode === 'onDemand') {
			try {
				model = getModelId(this.getNodeParameter('model', itemIndex));
			} catch (error) {
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		} else {
			dedicatedEndpointId = (
				this.getNodeParameter('dedicatedEndpointId', itemIndex, '') as string
			).trim();
			if (!dedicatedEndpointId) {
				throw new NodeOperationError(
					this.getNode(),
					'Dedicated Endpoint ID is required when using Dedicated Endpoint serving mode.',
					{ itemIndex },
				);
			}
		}

		const options = this.getNodeParameter('options', itemIndex, {}) as OciChatOptions;

		const temperature =
			typeof options.temperature === 'number' ? options.temperature : DEFAULT_TEMPERATURE;

		const maxTokens =
			typeof options.maxTokens === 'number' ? options.maxTokens : DEFAULT_MAX_TOKENS;

		const topP = typeof options.topP === 'number' ? options.topP : DEFAULT_TOP_P;

		const topK = typeof options.topK === 'number' && options.topK > 0 ? options.topK : undefined;

		const seed = typeof options.seed === 'number' && options.seed >= 0 ? options.seed : undefined;
		const timeout = options.timeout ?? DEFAULT_REQUEST_TIMEOUT;

		if (!Number.isInteger(timeout) || timeout < 1) {
			throw new NodeOperationError(
				this.getNode(),
				'Timeout must be a positive integer in milliseconds.',
				{ itemIndex },
			);
		}

		const client = await createOciGenAiClient(
			credentials,
			this.helpers.getSecureEgressFilter(),
			timeout,
		);
		const N8nOciGenAiGenericChat = await createN8nOciGenAiGenericChat();

		const defaultRequestParams: OciChatRequestParams = {
			temperature,
			maxTokens,
			topP,
			...(topK !== undefined ? { topK } : {}),
			...(seed !== undefined ? { seed } : {}),
		};

		const modelParams = {
			client,
			compartmentId,
			// Let OCI own retries so they share the configured request-time budget.
			maxRetries: 0,
			defaultRequestParams,
			...(servingMode === 'onDemand' ? { onDemandModelId: model } : { dedicatedEndpointId }),
		};

		const chatModel = new N8nOciGenAiGenericChat(modelParams);

		return {
			response: chatModel,
		};
	}
}
