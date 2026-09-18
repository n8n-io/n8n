import type { CredentialProvider } from '@n8n/agents';

import type { AiGatewayModelCredentialResolver } from '@/modules/agents/json-config/model-config';

export type AgentCredentialProvider = CredentialProvider &
	Partial<AiGatewayModelCredentialResolver>;

/**
 * An eval run pins a thread to the credentials its case declared. The Agent
 * Builder lists credentials through its own provider, so without this scope it
 * sees every credential in the shared project, including the ones concurrent
 * cases seeded, and `resolve_llm` answers `ambiguous_credential`.
 */
export function scopeCredentialProvider(
	provider: AgentCredentialProvider,
	allowedCredentialIds: string[],
): AgentCredentialProvider {
	const allowed = new Set(allowedCredentialIds);
	const gateway = provider.resolveAiGatewayModelCredential?.bind(provider);
	return {
		resolve: async (credentialId) => await provider.resolve(credentialId),
		list: async () => (await provider.list()).filter((credential) => allowed.has(credential.id)),
		...(gateway ? { resolveAiGatewayModelCredential: gateway } : {}),
	};
}
