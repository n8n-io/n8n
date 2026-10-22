export const GEN_AI_ATTR = {
	OPERATION_NAME: 'gen_ai.operation.name',
	PROVIDER_NAME: 'gen_ai.provider.name',
	REQUEST_MODEL: 'gen_ai.request.model',
	RESPONSE_MODEL: 'gen_ai.response.model',
	USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
	USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
	AGENT_NAME: 'gen_ai.agent.name',
	AGENT_ID: 'gen_ai.agent.id',
	USAGE_REPORTED: 'n8n.llm.usage_reported',
} as const;

export const GEN_AI_OPERATION = {
	CHAT: 'chat',
	INVOKE_AGENT: 'invoke_agent',
} as const;

const GEN_AI_PROVIDER = {
	ANTHROPIC: 'anthropic',
	AWS_BEDROCK: 'aws.bedrock',
	AZURE_AI_OPENAI: 'azure.ai.openai',
	COHERE: 'cohere',
	DEEPSEEK: 'deepseek',
	GCP_GEMINI: 'gcp.gemini',
	GCP_VERTEX_AI: 'gcp.vertex_ai',
	GROQ: 'groq',
	MISTRAL: 'mistral',
	MOONSHOT_AI: 'moonshot_ai',
	OPENAI: 'openai',
	X_AI: 'x_ai',
} as const;

const N8N_GEN_AI_PROVIDER = {
	ALIBABA_CLOUD: 'alibaba_cloud',
	DATABRICKS: 'databricks',
	LEMONADE: 'lemonade',
	MINIMAX: 'minimax',
	NVIDIA: 'nvidia',
	OLLAMA: 'ollama',
	OPENROUTER: 'openrouter',
	VERCEL_AI_GATEWAY: 'vercel.ai_gateway',
} as const;

type ValueOf<T> = T[keyof T];

type GenAiOperationName = ValueOf<typeof GEN_AI_OPERATION>;

type GenAiProviderName = ValueOf<typeof GEN_AI_PROVIDER> | ValueOf<typeof N8N_GEN_AI_PROVIDER>;

export type GenAiSpanAttributes = {
	[GEN_AI_ATTR.OPERATION_NAME]?: GenAiOperationName;
	[GEN_AI_ATTR.PROVIDER_NAME]?: GenAiProviderName;
	[GEN_AI_ATTR.REQUEST_MODEL]?: string;
	[GEN_AI_ATTR.RESPONSE_MODEL]?: string;
	[GEN_AI_ATTR.USAGE_INPUT_TOKENS]?: number;
	[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]?: number;
	[GEN_AI_ATTR.AGENT_NAME]?: string;
	[GEN_AI_ATTR.AGENT_ID]?: string;
	[GEN_AI_ATTR.USAGE_REPORTED]?: false;
};

type GenAiAttributeKey = ValueOf<typeof GEN_AI_ATTR>;

const GEN_AI_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set<GenAiAttributeKey>(
	Object.values(GEN_AI_ATTR),
);

const GEN_AI_OPERATION_NAMES: ReadonlySet<string> = new Set<GenAiOperationName>(
	Object.values(GEN_AI_OPERATION),
);

const GEN_AI_PROVIDER_NAMES: ReadonlySet<string> = new Set<GenAiProviderName>([
	...Object.values(GEN_AI_PROVIDER),
	...Object.values(N8N_GEN_AI_PROVIDER),
]);

const LANGCHAIN_NODE_PREFIX = '@n8n/n8n-nodes-langchain.';

const GEN_AI_PROVIDER_BY_NODE_TYPE: Readonly<Record<string, GenAiProviderName>> = {
	[`${LANGCHAIN_NODE_PREFIX}lmChatAnthropic`]: GEN_AI_PROVIDER.ANTHROPIC,
	[`${LANGCHAIN_NODE_PREFIX}lmChatAwsBedrock`]: GEN_AI_PROVIDER.AWS_BEDROCK,
	[`${LANGCHAIN_NODE_PREFIX}lmChatAzureOpenAi`]: GEN_AI_PROVIDER.AZURE_AI_OPENAI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatCohere`]: GEN_AI_PROVIDER.COHERE,
	[`${LANGCHAIN_NODE_PREFIX}lmChatDeepSeek`]: GEN_AI_PROVIDER.DEEPSEEK,
	[`${LANGCHAIN_NODE_PREFIX}lmChatGoogleGemini`]: GEN_AI_PROVIDER.GCP_GEMINI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatGoogleVertex`]: GEN_AI_PROVIDER.GCP_VERTEX_AI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatGroq`]: GEN_AI_PROVIDER.GROQ,
	[`${LANGCHAIN_NODE_PREFIX}lmChatMistralCloud`]: GEN_AI_PROVIDER.MISTRAL,
	[`${LANGCHAIN_NODE_PREFIX}lmChatMoonshot`]: GEN_AI_PROVIDER.MOONSHOT_AI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatOpenAi`]: GEN_AI_PROVIDER.OPENAI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatXAiGrok`]: GEN_AI_PROVIDER.X_AI,
	[`${LANGCHAIN_NODE_PREFIX}lmChatAlibabaCloud`]: N8N_GEN_AI_PROVIDER.ALIBABA_CLOUD,
	[`${LANGCHAIN_NODE_PREFIX}lmChatDatabricks`]: N8N_GEN_AI_PROVIDER.DATABRICKS,
	[`${LANGCHAIN_NODE_PREFIX}lmChatLemonade`]: N8N_GEN_AI_PROVIDER.LEMONADE,
	[`${LANGCHAIN_NODE_PREFIX}lmChatMinimax`]: N8N_GEN_AI_PROVIDER.MINIMAX,
	[`${LANGCHAIN_NODE_PREFIX}lmChatNvidia`]: N8N_GEN_AI_PROVIDER.NVIDIA,
	[`${LANGCHAIN_NODE_PREFIX}lmChatOllama`]: N8N_GEN_AI_PROVIDER.OLLAMA,
	[`${LANGCHAIN_NODE_PREFIX}lmChatOpenRouter`]: N8N_GEN_AI_PROVIDER.OPENROUTER,
	[`${LANGCHAIN_NODE_PREFIX}lmChatVercelAiGateway`]: N8N_GEN_AI_PROVIDER.VERCEL_AI_GATEWAY,
};

export function isGenAiAttributeKey(key: string): key is GenAiAttributeKey {
	return GEN_AI_ATTRIBUTE_KEYS.has(key);
}

function isGenAiOperationName(value: unknown): value is GenAiOperationName {
	return typeof value === 'string' && GEN_AI_OPERATION_NAMES.has(value);
}

function isGenAiProviderName(value: unknown): value is GenAiProviderName {
	return typeof value === 'string' && GEN_AI_PROVIDER_NAMES.has(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value !== '';
}

function isTokenCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

type ChatGenAiInput = {
	nodeType: string;
	requestModel?: string;
	responseModel?: string;
	usage?: { inputTokens: number; outputTokens: number };
};

export function buildChatGenAiAttributes(input: ChatGenAiInput): GenAiSpanAttributes {
	const attributes: GenAiSpanAttributes = {
		[GEN_AI_ATTR.OPERATION_NAME]: GEN_AI_OPERATION.CHAT,
		[GEN_AI_ATTR.PROVIDER_NAME]: GEN_AI_PROVIDER_BY_NODE_TYPE[input.nodeType],
		[GEN_AI_ATTR.REQUEST_MODEL]: input.requestModel,
		[GEN_AI_ATTR.RESPONSE_MODEL]: input.responseModel,
	};

	if (input.usage) {
		attributes[GEN_AI_ATTR.USAGE_INPUT_TOKENS] = input.usage.inputTokens;
		attributes[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS] = input.usage.outputTokens;
	} else {
		attributes[GEN_AI_ATTR.USAGE_REPORTED] = false;
	}

	return attributes;
}

export function pickGenAiAttributes(
	tracing: Record<string, string | number | boolean> | undefined,
): GenAiSpanAttributes {
	if (!tracing) return {};

	const operationName = tracing[GEN_AI_ATTR.OPERATION_NAME];
	const providerName = tracing[GEN_AI_ATTR.PROVIDER_NAME];
	const requestModel = tracing[GEN_AI_ATTR.REQUEST_MODEL];
	const responseModel = tracing[GEN_AI_ATTR.RESPONSE_MODEL];
	const inputTokens = tracing[GEN_AI_ATTR.USAGE_INPUT_TOKENS];
	const outputTokens = tracing[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS];
	const agentName = tracing[GEN_AI_ATTR.AGENT_NAME];
	const agentId = tracing[GEN_AI_ATTR.AGENT_ID];

	return {
		[GEN_AI_ATTR.OPERATION_NAME]: isGenAiOperationName(operationName) ? operationName : undefined,
		[GEN_AI_ATTR.PROVIDER_NAME]: isGenAiProviderName(providerName) ? providerName : undefined,
		[GEN_AI_ATTR.REQUEST_MODEL]: isNonEmptyString(requestModel) ? requestModel : undefined,
		[GEN_AI_ATTR.RESPONSE_MODEL]: isNonEmptyString(responseModel) ? responseModel : undefined,
		[GEN_AI_ATTR.USAGE_INPUT_TOKENS]: isTokenCount(inputTokens) ? inputTokens : undefined,
		[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]: isTokenCount(outputTokens) ? outputTokens : undefined,
		[GEN_AI_ATTR.AGENT_NAME]: isNonEmptyString(agentName) ? agentName : undefined,
		[GEN_AI_ATTR.AGENT_ID]: isNonEmptyString(agentId) ? agentId : undefined,
		[GEN_AI_ATTR.USAGE_REPORTED]: tracing[GEN_AI_ATTR.USAGE_REPORTED] === false ? false : undefined,
	};
}

export function toTracingMetadata(
	attributes: GenAiSpanAttributes,
): Record<string, string | number | boolean> {
	const tracing: Record<string, string | number | boolean> = {};
	for (const [key, value] of Object.entries(attributes)) {
		if (value !== undefined) tracing[key] = value;
	}
	return tracing;
}
