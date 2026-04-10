import type { ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import type {
	ILoadOptions,
	INodeCredentials,
	INodePropertyOptions,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import { PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

type RoutingConfig = NonNullable<ILoadOptions['routing']>;

type ResourceLocatorConfig = {
	type: 'resourceLocator';
};

type LoadOptionsConfig = {
	type: 'loadOptions';
	routing: RoutingConfig;
};

type LoadOptionsMultiConfig = {
	type: 'loadOptionsMulti';
	routings: RoutingConfig[];
};

type NoOpConfig = {
	type: 'noop';
};

export type LLMProviderFetchConfig =
	| ResourceLocatorConfig
	| LoadOptionsConfig
	| LoadOptionsMultiConfig
	| NoOpConfig;

// ---------------------------------------------------------------------------
// Routing helpers — DRY builders for common patterns
// ---------------------------------------------------------------------------

type PostReceiveStep = NonNullable<RoutingConfig['output']>['postReceive'] extends
	| (infer T)[]
	| undefined
	? T
	: never;

function loadOptions(
	url: string,
	rootProperty: string,
	keyValue: { name: string; value: string; description?: string },
	extraSteps: PostReceiveStep[] = [],
): LoadOptionsConfig {
	return {
		type: 'loadOptions',
		routing: {
			request: { method: 'GET', url },
			output: {
				postReceive: [
					{ type: 'rootProperty', properties: { property: rootProperty } },
					...extraSteps,
					{ type: 'setKeyValue', properties: keyValue },
					{ type: 'sort', properties: { key: 'name' } },
				],
			},
		},
	};
}

const ID_KEY = { name: '={{$responseItem.id}}', value: '={{$responseItem.id}}' } as const;
const NAME_KEY = { name: '={{$responseItem.name}}', value: '={{$responseItem.name}}' } as const;

// ---------------------------------------------------------------------------
// Provider fetch configs — one entry per ChatHubLLMProvider
// ---------------------------------------------------------------------------

export const LLM_PROVIDER_FETCH_CONFIGS: Record<ChatHubLLMProvider, LLMProviderFetchConfig> = {
	// --- Resource-locator providers ---
	openai: { type: 'resourceLocator' },
	anthropic: { type: 'resourceLocator' },

	// --- No-op providers (no API to list models) ---
	azureOpenAi: { type: 'noop' },
	azureEntraId: { type: 'noop' },

	// --- Standard load-options providers ---
	google: loadOptions(
		'/v1beta/models',
		'models',
		{
			...NAME_KEY,
			description: '={{$responseItem.description}}',
		},
		[{ type: 'filter', properties: { pass: "={{ !$responseItem.name.includes('embedding') }}" } }],
	),

	ollama: loadOptions('/api/tags', 'models', NAME_KEY),

	mistralCloud: loadOptions(
		'/models',
		'data',
		{
			name: '={{ $responseItem.id }}',
			value: '={{ $responseItem.id }}',
		},
		[{ type: 'filter', properties: { pass: "={{ !$responseItem.id.includes('embed') }}" } }],
	),

	cohere: loadOptions('/v1/models?page_size=100&endpoint=chat', 'models', {
		...NAME_KEY,
		description: '={{$responseItem.description}}',
	}),

	deepSeek: loadOptions('/models', 'data', ID_KEY),

	openRouter: loadOptions('/models', 'data', ID_KEY),

	groq: {
		type: 'loadOptions',
		routing: {
			request: { method: 'GET', url: '/models' },
			output: {
				postReceive: [
					{ type: 'rootProperty', properties: { property: 'data' } },
					{
						type: 'filter',
						properties: {
							pass: '={{ $responseItem.active === true && $responseItem.object === "model" }}',
						},
					},
					{ type: 'setKeyValue', properties: ID_KEY },
				],
			},
		},
	},

	xAiGrok: loadOptions('/models', 'data', ID_KEY),

	vercelAiGateway: loadOptions('/models', 'data', ID_KEY),

	// --- Multi-endpoint provider (AWS Bedrock) ---
	awsBedrock: {
		type: 'loadOptionsMulti',
		routings: [
			{
				request: {
					method: 'GET',
					url: '/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND',
				},
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: 'modelSummaries' } },
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.modelName}}',
								description: '={{$responseItem.modelArn}}',
								value: '={{$responseItem.modelId}}',
							},
						},
						{ type: 'sort', properties: { key: 'name' } },
					],
				},
			},
			{
				request: {
					method: 'GET',
					url: '/inference-profiles?maxResults=1000',
				},
				output: {
					postReceive: [
						{ type: 'rootProperty', properties: { property: 'inferenceProfileSummaries' } },
						{
							type: 'setKeyValue',
							properties: {
								name: '={{$responseItem.inferenceProfileName}}',
								description: '={{$responseItem.description || $responseItem.inferenceProfileArn}}',
								value: '={{$responseItem.inferenceProfileId}}',
							},
						},
						{ type: 'sort', properties: { key: 'name' } },
					],
				},
			},
		],
	},
} satisfies Record<ChatHubLLMProvider, LLMProviderFetchConfig>;

// Ensure the config covers every LLM provider at compile time
LLM_PROVIDER_FETCH_CONFIGS satisfies Record<
	Exclude<keyof typeof PROVIDER_CREDENTIAL_TYPE_MAP, 'n8n' | 'custom-agent'>,
	LLMProviderFetchConfig
>;

// ---------------------------------------------------------------------------
// Fetch function — dispatches to the right DynamicNodeParametersService method
// ---------------------------------------------------------------------------

export async function fetchLLMProviderModels(
	config: LLMProviderFetchConfig,
	provider: ChatHubLLMProvider,
	credentials: INodeCredentials,
	additionalData: IWorkflowExecuteAdditionalData,
	nodeParametersService: DynamicNodeParametersService,
): Promise<INodePropertyOptions[]> {
	const nodeType = PROVIDER_NODE_TYPE_MAP[provider];

	switch (config.type) {
		case 'noop':
			return [];

		case 'resourceLocator': {
			const result = await nodeParametersService.getResourceLocatorResults(
				'searchModels',
				'parameters.model',
				additionalData,
				nodeType,
				{},
				credentials,
			);
			return result.results;
		}

		case 'loadOptions':
			return await nodeParametersService.getOptionsViaLoadOptions(
				{ routing: config.routing },
				additionalData,
				nodeType,
				{},
				credentials,
			);

		case 'loadOptionsMulti': {
			const results = await Promise.all(
				config.routings.map(
					async (routing) =>
						await nodeParametersService.getOptionsViaLoadOptions(
							{ routing },
							additionalData,
							nodeType,
							{},
							credentials,
						),
				),
			);
			return results.flat();
		}
	}
}
