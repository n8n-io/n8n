import type { ModelConfig } from '@n8n/agents';
import type { EvaluationConfig, User } from '@n8n/db';
import { EvaluationConfigRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';

// LLM-judge provider node types → `@n8n/agents` provider prefix. Only the
// api-key-based providers are wired for insights; anything else (Ollama,
// Vertex, Bedrock, Azure, and the regional clouds) maps to null so insights
// fall back to the deterministic summary rather than guess a config shape.
const PROVIDER_PREFIX_BY_NODE_TYPE = new Map<string, string>([
	['@n8n/n8n-nodes-langchain.lmChatOpenAi', 'openai'],
	['@n8n/n8n-nodes-langchain.lmChatAnthropic', 'anthropic'],
	['@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'google'],
	['@n8n/n8n-nodes-langchain.lmChatXAiGrok', 'xai'],
	['@n8n/n8n-nodes-langchain.lmChatGroq', 'groq'],
	['@n8n/n8n-nodes-langchain.lmChatDeepSeek', 'deepseek'],
	['@n8n/n8n-nodes-langchain.lmChatCohere', 'cohere'],
	['@n8n/n8n-nodes-langchain.lmChatMistralCloud', 'mistral'],
	['@n8n/n8n-nodes-langchain.lmChatOpenRouter', 'openrouter'],
	['@n8n/n8n-nodes-langchain.lmChatVercelAiGateway', 'vercel'],
]);

// Providers whose n8n credential default base URL omits the version path the
// `@ai-sdk/*` client expects; forward nothing so the SDK uses its own default.
const SKIP_CREDENTIAL_BASE_URL = new Set(['google', 'cohere']);

export type ResolvedInsightsModel = {
	// Ready-to-use `@n8n/agents` model config with the decrypted key embedded —
	// passed straight to `Agent.model()`.
	modelConfig: ModelConfig;
	// `provider/model` id for telemetry + the response's `modelUsed` field.
	modelId: string;
};

/**
 * Resolves a collection's evaluation-config LLM-judge metric into a ready-to-use
 * `@n8n/agents` model config, reusing the same provider + credential the user
 * already configured for judging. Returns null when there's no judge metric or
 * its provider isn't one we map — callers then fall back to deterministic
 * insights.
 */
@Service()
export class InsightsModelResolver {
	constructor(
		private readonly evalConfigRepo: EvaluationConfigRepository,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
	) {}

	async resolve(
		user: User,
		workflowId: string,
		evaluationConfigId: string,
		// Pass the already-loaded config to avoid a second lookup; omit to fetch.
		preloadedConfig?: EvaluationConfig | null,
	): Promise<ResolvedInsightsModel | null> {
		const config =
			preloadedConfig !== undefined
				? preloadedConfig
				: await this.evalConfigRepo.findByIdAndWorkflowId(evaluationConfigId, workflowId);
		if (!config) return null;

		// Reuse the first LLM-judge metric's model. Collections score against a
		// single judge today, so the first is the active one.
		const judge = config.metrics.find((metric) => metric.type === 'llm_judge');
		if (!judge || judge.type !== 'llm_judge') return null;

		const prefix = PROVIDER_PREFIX_BY_NODE_TYPE.get(judge.config.provider);
		if (!prefix) return null;

		// Scoped lookup: only decrypt the judge credential when the requesting
		// user can read it. Returns null (→ deterministic fallback) otherwise, so
		// insights never use a credential the user isn't entitled to.
		const credential = await this.credentialsFinder.findCredentialForUser(
			judge.config.credentialId,
			user,
			['credential:read'],
		);
		if (!credential) return null;

		const data = await this.credentialsService.decrypt(credential, true);
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : undefined;
		if (!apiKey) return null;
		// Forward the credential's base URL (spelled `url`) so proxy/self-hosted
		// endpoints work — but NOT for google/cohere: their credential defaults
		// (`host` = generativelanguage.googleapis.com, `url` = api.cohere.ai) omit
		// the version path the SDK expects, so passing them verbatim breaks the
		// call. Skipping lets @ai-sdk use its own correct default (…/v1beta, …/v2).
		const url =
			SKIP_CREDENTIAL_BASE_URL.has(prefix) || typeof data.url !== 'string' ? undefined : data.url;

		const modelId = `${prefix}/${judge.config.model}`;
		return { modelConfig: { id: modelId, apiKey, url }, modelId };
	}
}
