// Copied from the OTel GenAI registry instead of importing them from
// `@opentelemetry/semantic-conventions/incubating`, because OTel asks instrumentation
// libraries to copy unstable definitions:
// https://opentelemetry.io/docs/specs/semconv/non-normative/code-generation/#stability-and-versioning
// https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#unstable-semconv
// Source: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md
import type { ITaskMetadata } from 'n8n-workflow';

export const GEN_AI_ATTR = {
	OPERATION_NAME: 'gen_ai.operation.name',
	PROVIDER_NAME: 'gen_ai.provider.name',
	REQUEST_MODEL: 'gen_ai.request.model',
	RESPONSE_MODEL: 'gen_ai.response.model',
	USAGE_INPUT_TOKENS: 'gen_ai.usage.input_tokens',
	USAGE_OUTPUT_TOKENS: 'gen_ai.usage.output_tokens',
	AGENT_NAME: 'gen_ai.agent.name',
	AGENT_ID: 'gen_ai.agent.id',
} as const;

export const N8N_USAGE_REPORTED_ATTR = 'n8n.llm.usage_reported';

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

export type GenAiProviderName = SpecProviderName | N8nProviderName;

export type GenAiAttributes = NonNullable<ITaskMetadata['tracing']>;

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

const GEN_AI_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set([
	...Object.values(GEN_AI_ATTR),
	N8N_USAGE_REPORTED_ATTR,
]);

export function isGenAiAttributeKey(key: string): boolean {
	return GEN_AI_ATTRIBUTE_KEYS.has(key);
}

export function buildChatGenAiAttributes({
	nodeType,
	providerName,
	requestModel,
	responseModel,
	usage,
}: {
	nodeType: string;
	providerName?: GenAiProviderName;
	requestModel?: string;
	responseModel?: string;
	usage?: { promptTokens: number; completionTokens: number };
}): GenAiAttributes {
	const provider =
		providerName ?? PROVIDER_BY_CHAT_MODEL_NODE[nodeType.replace(LANGCHAIN_NODE_PREFIX, '')];

	return {
		[GEN_AI_ATTR.OPERATION_NAME]: 'chat',
		...(provider && { [GEN_AI_ATTR.PROVIDER_NAME]: provider }),
		...(requestModel && { [GEN_AI_ATTR.REQUEST_MODEL]: requestModel }),
		...(responseModel && { [GEN_AI_ATTR.RESPONSE_MODEL]: responseModel }),
		...(usage
			? {
					[GEN_AI_ATTR.USAGE_INPUT_TOKENS]: usage.promptTokens,
					[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]: usage.completionTokens,
				}
			: { [N8N_USAGE_REPORTED_ATTR]: false }),
	};
}
