import { AGENT_VECTOR_STORE_CREDENTIAL_TYPES, type AgentVectorStoreProvider } from '@n8n/api-types';

export interface AgentVectorStoreProviderDefinition {
	displayName: string;
	credentialType: string;
}

export const AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS = {
	pinecone: {
		displayName: 'Pinecone',
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.pinecone,
	},
	supabase: {
		displayName: 'Supabase',
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.supabase,
	},
	qdrant: { displayName: 'Qdrant', credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.qdrant },
	postgres: {
		displayName: 'Postgres',
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.postgres,
	},
} satisfies Record<AgentVectorStoreProvider, AgentVectorStoreProviderDefinition>;

export interface AgentEmbeddingModelOption {
	model: string;
	dimensions: number;
}

export const AGENT_EMBEDDING_MODEL_OPTIONS: readonly AgentEmbeddingModelOption[] = [
	{ model: 'openai/text-embedding-3-small', dimensions: 1536 },
	{ model: 'openai/text-embedding-3-large', dimensions: 3072 },
	{ model: 'openai/text-embedding-ada-002', dimensions: 1536 },
	{ model: 'google/gemini-embedding-001', dimensions: 3072 },
	{ model: 'google/text-embedding-004', dimensions: 768 },
	{ model: 'mistral/mistral-embed', dimensions: 1024 },
	{ model: 'cohere/embed-english-v3.0', dimensions: 1024 },
	{ model: 'cohere/embed-multilingual-v3.0', dimensions: 1024 },
] as const;

/** Providers with an embedding model in {@link AGENT_EMBEDDING_MODEL_OPTIONS}, in display order. */
export type AgentEmbeddingProvider = 'openai' | 'google' | 'mistral' | 'cohere';
export const AGENT_EMBEDDING_PROVIDERS: readonly AgentEmbeddingProvider[] = [
	'openai',
	'google',
	'mistral',
	'cohere',
];

export function isAgentEmbeddingProvider(value: string): value is AgentEmbeddingProvider {
	return AGENT_EMBEDDING_PROVIDERS.some((provider) => provider === value);
}

export function getEmbeddingModelProvider(model: string): AgentEmbeddingProvider | null {
	const prefix = model.split('/')[0];
	return isAgentEmbeddingProvider(prefix) ? prefix : null;
}

export function getEmbeddingModelsForProvider(
	provider: AgentEmbeddingProvider,
): AgentEmbeddingModelOption[] {
	return AGENT_EMBEDDING_MODEL_OPTIONS.filter(
		(option) => getEmbeddingModelProvider(option.model) === provider,
	);
}
