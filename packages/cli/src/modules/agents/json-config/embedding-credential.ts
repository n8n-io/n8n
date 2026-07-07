import type { CredentialProvider } from '@n8n/agents';

import { mapCredentialForProvider } from './credential-field-mapping';
import { getProviderPrefix } from './model-id';

export interface ManagedEmbeddingProviderOptions {
	apiKey?: string;
	baseURL?: string;
	fetch?: typeof globalThis.fetch;
}
export type ManagedEmbeddingProviderOptionsResolver =
	() => Promise<ManagedEmbeddingProviderOptions | null>;

/**
 * Resolves an n8n credential into embedding provider options (apiKey/baseURL)
 * for the given embedding model's provider prefix. Shared by episodic memory
 * and vector store connections — both attach an embedding model to a
 * user-selected credential rather than the managed AI proxy.
 */
export async function resolveEmbeddingProviderOptionsFromCredential(
	credential: string,
	embeddingModel: string,
	credentialProvider: CredentialProvider,
): Promise<ManagedEmbeddingProviderOptions> {
	const raw = await credentialProvider.resolve(credential);
	const mapped = mapCredentialForProvider(getProviderPrefix(embeddingModel), raw);
	return {
		...(typeof mapped.apiKey === 'string' && { apiKey: mapped.apiKey }),
		...(typeof mapped.baseURL === 'string' && { baseURL: mapped.baseURL }),
	};
}
