import type { CredentialProvider, ResolvedCredential } from '@n8n/agents';

/**
 * A `CredentialProvider` that can also mint the n8n Connect (AI Gateway)
 * synthetic credential for a model slot, keyed by the model's provider prefix
 * (e.g. `openai`). `AgentsCredentialProvider` implements this; keeping the
 * capability on the provider avoids threading a resolver through the build path.
 */
export interface AiGatewayModelCredentialResolver {
	resolveAiGatewayModelCredential(provider: string): Promise<ResolvedCredential>;
}

export type AgentCredentialProvider = CredentialProvider &
	Partial<AiGatewayModelCredentialResolver>;
