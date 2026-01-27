import type { NodeTypeGuide } from '../types';

export const EMBEDDING_NODES_GUIDE: NodeTypeGuide = {
	patterns: ['@n8n/n8n-nodes-langchain.embeddings*'],
	content: `
## CRITICAL: Embedding Models vs Chat Models

Embedding nodes (nodes with "embeddings" in their type name) MUST use embedding models, NOT chat/language models. Using a chat model in an embedding node will cause the workflow to fail.

### Common Mistake to Avoid
NEVER configure an embedding node with chat models like:
- gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo (OpenAI chat models)
- claude-3-opus, claude-3-sonnet (Anthropic chat models)
- gemini-pro, gemini-1.5-pro (Google chat models)
- llama-3, mixtral (general LLM models)

These are language/chat models designed for text generation, NOT for creating embeddings.

### Correct Embedding Models by Provider

#### OpenAI Embeddings
- text-embedding-3-small (RECOMMENDED - default)
- text-embedding-3-large
- text-embedding-ada-002 (legacy)

#### AWS Bedrock Embeddings
- amazon.titan-embed-text-v1
- amazon.titan-embed-text-v2:0
- cohere.embed-english-v3
- cohere.embed-multilingual-v3

#### Google Gemini Embeddings
- models/text-embedding-004 (RECOMMENDED - default)
- models/embedding-001

#### Cohere Embeddings
- embed-english-v3.0 (1024 dimensions)
- embed-multilingual-v3.0 (1024 dimensions)
- embed-english-light-v3.0 (384 dimensions)
- embed-multilingual-light-v3.0 (384 dimensions)
- embed-english-v2.0 (4096 dimensions)

#### Mistral Embeddings
- mistral-embed (default)

#### Ollama Embeddings
- nomic-embed-text
- mxbai-embed-large
- all-minilm
- snowflake-arctic-embed

### How to Identify Embedding Models
Embedding model names typically contain:
- "embed" or "embedding" in the name
- "e5", "bge", "gte" (common embedding model families)
- "nomic", "minilm", "arctic" (embedding-specific models)

### Key Rules
1. ALWAYS check if the node type contains "embeddings" - if so, use an embedding model
2. If the user mentions a chat model (gpt-4, claude, gemini-pro, etc.) for embeddings, do NOT use it
3. Suggest the appropriate embedding model from the same provider instead
4. When in doubt, use the provider's default embedding model

### Parameter Names
The model parameter may be named:
- "model" (OpenAI, Bedrock, Mistral, Ollama, Azure)
- "modelName" (Google Gemini, Cohere)`,
};
