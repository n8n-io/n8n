import type { CredentialProvider } from '@n8n/agents';

import type { AiGatewayModelCredentialResolver } from '@/modules/agents/json-config/model-config';

export type AgentCredentialProvider = CredentialProvider &
	Partial<AiGatewayModelCredentialResolver>;

/**
 * An eval run pins a thread to the credentials its case declared. The Agent
 * Builder lists credentials through its own provider, so without this scope it
 * sees every credential in the shared project, including the ones concurrent
 * cases seeded, and `resolve_llm` answers `ambiguous_credential`.
 *
 * The allowlist is read on every `list` call, not snapshotted: a credential the
 * harness creates on a setup card must show on the next card of the same run.
 * An `undefined` allowlist leaves the list unscoped.
 */
export function scopeCredentialProvider(
	provider: AgentCredentialProvider,
	getAllowedCredentialIds: () => string[] | undefined,
): AgentCredentialProvider {
	const gateway = provider.resolveAiGatewayModelCredential?.bind(provider);
	return {
		resolve: async (credentialId) => await provider.resolve(credentialId),
		list: async () => {
			const allowedIds = getAllowedCredentialIds();
			const listed = await provider.list();
			if (allowedIds === undefined) return listed;
			const allowed = new Set(allowedIds);
			return listed.filter((credential) => allowed.has(credential.id));
		},
		...(gateway ? { resolveAiGatewayModelCredential: gateway } : {}),
	};
}
