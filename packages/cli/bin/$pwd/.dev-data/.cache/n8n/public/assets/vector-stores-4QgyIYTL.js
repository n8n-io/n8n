import { FD as AGENT_VECTOR_STORE_CREDENTIAL_TYPES } from "./app-D5flEmb-.js";
//#region src/features/agents/vector-stores.ts
var AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS = {
	pinecone: {
		displayName: "Pinecone",
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.pinecone
	},
	supabase: {
		displayName: "Supabase",
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.supabase
	},
	qdrant: {
		displayName: "Qdrant",
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.qdrant
	},
	postgres: {
		displayName: "Postgres",
		credentialType: AGENT_VECTOR_STORE_CREDENTIAL_TYPES.postgres
	}
};
var AGENT_EMBEDDING_MODEL_OPTIONS = [
	{
		model: "openai/text-embedding-3-small",
		dimensions: 1536
	},
	{
		model: "openai/text-embedding-3-large",
		dimensions: 3072
	},
	{
		model: "openai/text-embedding-ada-002",
		dimensions: 1536
	},
	{
		model: "google/gemini-embedding-001",
		dimensions: 3072
	},
	{
		model: "google/text-embedding-004",
		dimensions: 768
	},
	{
		model: "mistral/mistral-embed",
		dimensions: 1024
	},
	{
		model: "cohere/embed-english-v3.0",
		dimensions: 1024
	},
	{
		model: "cohere/embed-multilingual-v3.0",
		dimensions: 1024
	}
];
var AGENT_EMBEDDING_PROVIDERS = [
	"openai",
	"google",
	"mistral",
	"cohere"
];
function isAgentEmbeddingProvider(value) {
	return AGENT_EMBEDDING_PROVIDERS.some((provider) => provider === value);
}
function getEmbeddingModelProvider(model) {
	const prefix = model.split("/")[0];
	return isAgentEmbeddingProvider(prefix) ? prefix : null;
}
function getEmbeddingModelsForProvider(provider) {
	return AGENT_EMBEDDING_MODEL_OPTIONS.filter((option) => getEmbeddingModelProvider(option.model) === provider);
}
//#endregion
export { isAgentEmbeddingProvider as a, getEmbeddingModelsForProvider as i, AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS as n, getEmbeddingModelProvider as r, AGENT_EMBEDDING_PROVIDERS as t };
