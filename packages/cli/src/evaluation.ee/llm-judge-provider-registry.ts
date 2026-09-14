import { LLM_JUDGE_PROVIDERS, type LlmJudgeProvider } from '@n8n/api-types';
import { Service } from '@n8n/di';

// Re-export the shared shapes so existing importers keep their types.
export type { ProviderCredentialType } from '@n8n/api-types';
export type ProviderEntry = LlmJudgeProvider;

const PROVIDERS_BY_NODE_TYPE = new Map(LLM_JUDGE_PROVIDERS.map((p) => [p.nodeType, p]));
const PROVIDERS_BY_CREDENTIAL_TYPE = new Map(
	LLM_JUDGE_PROVIDERS.flatMap((p) => p.credentialTypes.map((c) => [c.name, p] as const)),
);

@Service()
export class LlmJudgeProviderRegistry {
	listProviders(): ProviderEntry[] {
		return LLM_JUDGE_PROVIDERS;
	}

	get(nodeType: string): ProviderEntry | undefined {
		return PROVIDERS_BY_NODE_TYPE.get(nodeType);
	}

	/** Resolve the provider selected by a credential type (unique per provider). */
	getByCredentialType(credentialType: string): ProviderEntry | undefined {
		return PROVIDERS_BY_CREDENTIAL_TYPE.get(credentialType);
	}
}
