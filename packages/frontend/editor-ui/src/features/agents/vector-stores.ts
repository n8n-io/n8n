import type { AgentVectorStoreProvider } from '@n8n/api-types';

export interface AgentVectorStoreProviderDefinition {
	displayName: string;
	credentialType: string;
}

export const AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS = {
	pinecone: { displayName: 'Pinecone', credentialType: 'pineconeApi' },
	supabase: { displayName: 'Supabase', credentialType: 'supabaseApi' },
	qdrant: { displayName: 'Qdrant', credentialType: 'qdrantApi' },
	postgres: { displayName: 'Postgres', credentialType: 'postgres' },
} satisfies Record<AgentVectorStoreProvider, AgentVectorStoreProviderDefinition>;

export interface AgentEmbeddingModelOption {
	model: string;
	dimensions: number;
	credentialTypes: readonly [string, ...string[]];
}

export const AGENT_EMBEDDING_MODEL_OPTIONS: readonly AgentEmbeddingModelOption[] = [
	{ model: 'openai/text-embedding-3-small', dimensions: 1536, credentialTypes: ['openAiApi'] },
	{ model: 'openai/text-embedding-3-large', dimensions: 3072, credentialTypes: ['openAiApi'] },
	{ model: 'openai/text-embedding-ada-002', dimensions: 1536, credentialTypes: ['openAiApi'] },
	{ model: 'google/gemini-embedding-001', dimensions: 3072, credentialTypes: ['googlePalmApi'] },
	{ model: 'google/text-embedding-004', dimensions: 768, credentialTypes: ['googlePalmApi'] },
	{ model: 'mistral/mistral-embed', dimensions: 1024, credentialTypes: ['mistralCloudApi'] },
	{ model: 'cohere/embed-english-v3.0', dimensions: 1024, credentialTypes: ['cohereApi'] },
	{ model: 'cohere/embed-multilingual-v3.0', dimensions: 1024, credentialTypes: ['cohereApi'] },
] as const;

/** Providers with an embedding model in {@link AGENT_EMBEDDING_MODEL_OPTIONS}, in display order. */
export type AgentEmbeddingProvider = 'openai' | 'google' | 'mistral' | 'cohere';
export const AGENT_EMBEDDING_PROVIDERS: readonly AgentEmbeddingProvider[] = [
	'openai',
	'google',
	'mistral',
	'cohere',
];

export function getEmbeddingModelProvider(model: string): AgentEmbeddingProvider {
	return model.split('/')[0] as AgentEmbeddingProvider;
}

export function getEmbeddingModelsForProvider(
	provider: AgentEmbeddingProvider,
): AgentEmbeddingModelOption[] {
	return AGENT_EMBEDDING_MODEL_OPTIONS.filter(
		(option) => getEmbeddingModelProvider(option.model) === provider,
	);
}
