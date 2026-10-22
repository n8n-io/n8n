// Copied from the OTel GenAI registry instead of importing them from
// `@opentelemetry/semantic-conventions/incubating`, because OTel asks instrumentation
// libraries to copy unstable definitions:
// https://opentelemetry.io/docs/specs/semconv/non-normative/code-generation/#stability-and-versioning
// https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#unstable-semconv
// Source: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md
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

type SpecProviderName =
	| 'anthropic'
	| 'aws.bedrock'
	| 'azure.ai.openai'
	| 'cohere'
	| 'deepseek'
	| 'gcp.gemini'
	| 'gcp.vertex_ai'
	| 'groq'
	| 'mistral'
	| 'moonshot_ai'
	| 'openai'
	| 'x_ai';

type N8nProviderName =
	| 'alibaba_cloud'
	| 'databricks'
	| 'lemonade'
	| 'minimax'
	| 'nvidia'
	| 'ollama'
	| 'openrouter'
	| 'vercel.ai_gateway';

type GenAiProviderName = SpecProviderName | N8nProviderName;

export type GenAiAttributes = Record<string, string | number | boolean>;

const LANGCHAIN_NODE_PREFIX = '@n8n/n8n-nodes-langchain.';

const PROVIDER_BY_CHAT_MODEL_NODE: Readonly<Record<string, GenAiProviderName>> = {
	lmChatAlibabaCloud: 'alibaba_cloud',
	lmChatAnthropic: 'anthropic',
	lmChatAwsBedrock: 'aws.bedrock',
	lmChatAzureOpenAi: 'azure.ai.openai',
	lmChatCohere: 'cohere',
	lmChatDatabricks: 'databricks',
	lmChatDeepSeek: 'deepseek',
	lmChatGoogleGemini: 'gcp.gemini',
	lmChatGoogleVertex: 'gcp.vertex_ai',
	lmChatGroq: 'groq',
	lmChatLemonade: 'lemonade',
	lmChatMinimax: 'minimax',
	lmChatMistralCloud: 'mistral',
	lmChatMoonshot: 'moonshot_ai',
	lmChatNvidia: 'nvidia',
	lmChatOllama: 'ollama',
	lmChatOpenAi: 'openai',
	lmChatOpenRouter: 'openrouter',
	lmChatVercelAiGateway: 'vercel.ai_gateway',
	lmChatXAiGrok: 'x_ai',
};

const GEN_AI_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set(Object.values(GEN_AI_ATTR));

export function isGenAiAttributeKey(key: string): boolean {
	return GEN_AI_ATTRIBUTE_KEYS.has(key);
}

export function buildChatGenAiAttributes(input: {
	nodeType: string;
	requestModel?: string;
	responseModel?: string;
	usage?: { inputTokens: number; outputTokens: number };
}): GenAiAttributes {
	const attributes: GenAiAttributes = { [GEN_AI_ATTR.OPERATION_NAME]: 'chat' };

	const provider = input.nodeType.startsWith(LANGCHAIN_NODE_PREFIX)
		? PROVIDER_BY_CHAT_MODEL_NODE[input.nodeType.slice(LANGCHAIN_NODE_PREFIX.length)]
		: undefined;
	if (provider) attributes[GEN_AI_ATTR.PROVIDER_NAME] = provider;
	if (input.requestModel) attributes[GEN_AI_ATTR.REQUEST_MODEL] = input.requestModel;
	if (input.responseModel) attributes[GEN_AI_ATTR.RESPONSE_MODEL] = input.responseModel;

	if (input.usage) {
		attributes[GEN_AI_ATTR.USAGE_INPUT_TOKENS] = input.usage.inputTokens;
		attributes[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS] = input.usage.outputTokens;
	} else {
		attributes[GEN_AI_ATTR.USAGE_REPORTED] = false;
	}

	return attributes;
}
