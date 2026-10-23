import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

import { callContextStorage, getLlmUsageSink } from './state';
import type { LlmCallContext, LlmUsage } from './types';

/** Provider names that client libraries report, mapped to the one name of pricing and identity. */
const PROVIDER_ALIASES: Record<string, string> = {
	google_genai: 'google',
	google_vertexai: 'google',
	vertexai: 'google',
	azure: 'openai',
	azure_openai: 'openai',
	amazon_bedrock: 'bedrock',
	mistralai: 'mistral',
	moonshotai: 'moonshot',
	dashscope: 'alibaba',
	// Provider IDs of the Agents runtime.
	'google-vertex': 'google',
	'google-vertex-anthropic': 'anthropic',
	'azure-openai': 'openai',
	'aws-bedrock': 'bedrock',
};

/**
 * The provider of each LLM credential type. Many providers answer in the OpenAI format, so a
 * node's credential names the provider better than the response does.
 */
const PROVIDER_BY_CREDENTIAL: Record<string, string> = {
	openAiApi: 'openai',
	azureOpenAiApi: 'openai',
	azureEntraCognitiveServicesOAuth2Api: 'openai',
	anthropicApi: 'anthropic',
	googlePalmApi: 'google',
	googleVertexAiApi: 'google',
	moonshotApi: 'moonshot',
	minimaxApi: 'minimax',
	alibabaCloudApi: 'alibaba',
	mistralCloudApi: 'mistral',
	deepSeekApi: 'deepseek',
	xAiApi: 'xai',
	groqApi: 'groq',
	cohereApi: 'cohere',
	nvidiaApi: 'nvidia',
	openRouterApi: 'openrouter',
	ollamaApi: 'ollama',
	perplexityApi: 'perplexity',
	vercelAiGatewayApi: 'vercel',
	lemonadeApi: 'lemonade',
	huggingFaceApi: 'huggingface',
};

/** IDs that LangChain (`run-`) and the AI SDK (`aitxt-`) invent when the provider sends none. */
const LIBRARY_GENERATED_ID = /^(run-|aitxt-)/;

/** One provider name for pricing and identity. AI SDK names carry a transport, as in `openai.chat`. */
export function normalizeProvider(name: string): string {
	const lower = name.toLowerCase().split('.')[0];
	return PROVIDER_ALIASES[lower] ?? lower;
}

/** The provider that a node credential type belongs to, when it is an LLM credential. */
export function providerFromCredential(credentialType: string | undefined): string | undefined {
	return credentialType ? PROVIDER_BY_CREDENTIAL[credentialType] : undefined;
}

/** The provider of the first LLM credential among a node's credential types. */
export function providerFromCredentials(credentialTypes: string[]): string | undefined {
	return credentialTypes.map(providerFromCredential).find((provider) => provider !== undefined);
}

/**
 * The call identity. A provider response ID gives the same ID in every adapter that sees the
 * call. The model and token counts are part of it, because some local servers (Ollama) reuse
 * a small set of response IDs. Without a response ID, a time-ordered UUID.
 */
function callId(provider: string, providerResponseId: string | undefined, usage: LlmUsage): string {
	if (!providerResponseId) return uuidv7();
	const parts = [provider, providerResponseId, usage.model, usage.inputTokens, usage.outputTokens];
	return createHash('sha256').update(parts.join(':')).digest('hex');
}

/** Sends one LLM call to the sink. `context` overrides the scope context. Never throws. */
export function reportLlmUsage(usage: LlmUsage, context?: LlmCallContext): void {
	try {
		const sink = getLlmUsageSink();
		if (!sink) return;

		const provider = normalizeProvider(usage.provider);
		const providerResponseId =
			usage.providerResponseId && !LIBRARY_GENERATED_ID.test(usage.providerResponseId)
				? usage.providerResponseId
				: undefined;
		sink.write({
			...usage,
			provider,
			providerResponseId,
			id: callId(provider, providerResponseId, usage),
			context: context ?? callContextStorage.getStore() ?? { callerType: 'unknown' },
		});
	} catch {
		// Capture must never break the caller, also with malformed usage from a library.
	}
}
