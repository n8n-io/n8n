import type { CredentialProvider, EmbeddingProviderOptions } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

import { mapCredentialForProvider } from '@/credentials/credential-field-mapping';

/** Re-exported so callers don't need to depend on `@n8n/agents` directly for this type. */
export type ManagedEmbeddingProviderOptions = EmbeddingProviderOptions;
export type ManagedEmbeddingProviderOptionsResolver =
	() => Promise<ManagedEmbeddingProviderOptions | null>;

/** Keys `createEmbeddingModel` (via `EmbeddingProviderOptions`) accepts, across all supported providers. */
const EMBEDDING_PROVIDER_OPTION_KEYS = [
	'apiKey',
	'baseURL',
	'region',
	'accessKeyId',
	'secretAccessKey',
	'sessionToken',
] as const satisfies ReadonlyArray<keyof EmbeddingProviderOptions>;

/**
 * Resolves an n8n credential into embedding provider options for the given
 * embedding model's provider prefix. Shared by episodic memory and vector
 * store connections — both attach an embedding model to a user-selected
 * credential rather than the managed AI proxy.
 *
 * Preserves every mapped field `EmbeddingProviderOptions` supports (not just
 * apiKey/baseURL) so credential-based providers like AWS Bedrock, which
 * authenticate via region/accessKeyId/secretAccessKey instead of an API key,
 * still get their credentials through.
 */
export async function resolveEmbeddingProviderOptionsFromCredential(
	credential: string,
	embeddingModel: string,
	credentialProvider: CredentialProvider,
): Promise<ManagedEmbeddingProviderOptions> {
	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(embeddingModel), raw);
	const options: ManagedEmbeddingProviderOptions = {};
	for (const key of EMBEDDING_PROVIDER_OPTION_KEYS) {
		const value = mapped[key];
		if (typeof value === 'string') options[key] = value;
	}
	return options;
}

export interface EpisodicMemoryEmbeddingTransport {
	resolveManaged?: ManagedEmbeddingProviderOptionsResolver;
	/** Proxy-aware `fetch` for a credential embedder. Managed options bring their own. */
	fetch?: ManagedEmbeddingProviderOptions['fetch'];
}

/**
 * Resolves the provider options of the episodic memory embedder from its
 * credential setting. Returns null when managed embeddings are not available.
 */
export async function resolveEpisodicMemoryEmbeddingProviderOptions(
	credential: string,
	embeddingModel: string,
	credentialProvider: CredentialProvider,
	{ resolveManaged, fetch }: EpisodicMemoryEmbeddingTransport = {},
): Promise<ManagedEmbeddingProviderOptions | null> {
	if (credential === MANAGED_CREDENTIAL_TOKEN) {
		return (await resolveManaged?.()) ?? null;
	}
	const options = await resolveEmbeddingProviderOptionsFromCredential(
		credential,
		embeddingModel,
		credentialProvider,
	);
	return fetch ? { ...options, fetch } : options;
}
