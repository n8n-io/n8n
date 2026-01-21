# File Knowledge for Personal Agents


## Overview

File Knowledge allows users to provide contextual knowledge as file attachments to their personal agents. The agent generates answers based on this information, enabling more relevant responses within the agent's specific domain.

## Supported file types

Users can upload

- All file types that the agent's base LLM model supports
- PDF files (prerequisites apply, see the next section)

Files are stored accordingly to the instance's binary file settings, and get deleted when the file is removed from the agent or the agent gets deleted.

 

## Prerequisites for processing PDFs

PDF file knowledge is achieved via RAG (retrieval augmented generation), and thus requires following extra setup.

### Database Support

The SQLite implementation uses the [sqlite-vec](https://github.com/asg017/sqlite-vec) NPM package and works out of the box.

For PostgreSQL to work, the [pgvector](https://github.com/pgvector/pgvector) extension must be available when the instance version is upgraded. During migration, the script attempts to enable the extension. If the extension is not available or the enablement fails, table creation is skipped and PDF file uploads remain unavailable in that instance [Should we allow the instance admin to add pgvector when they are ready?].

In both cases, sufficient disk space is required to store the new vector table [How much?].

### Credentials

Chat users can upload PDF files to agents using base LLM models from providers in [List 1] below without any further setup.

For base LLM models from providers in [List 2] to work, an admin user must set a default credential for one of the providers in [List 1] on the settings page [Should we make this configurable by chat users themselves?].

#### List 1: Default support

- OpenAI
- Google Gemini
- Azure OpenAI
- Ollama
- AWS Bedrock
- Cohere
- Mistral Cloud

#### List 2: Support with extra embedding credential

- Anthropic
- Vercel AI Gateway
- xAI Grok
- Groq
- OpenRouter
- DeepSeek

Embeddings are not compatible between providers. When switching the base model provider, embeddings are regenerated for all PDF files attached to the agent.


## Cost (for the user)

Uploading PDFs incurs the costs of creating embeddings, but they tend to be significantly cheaper than text generation. For example, see https://platform.openai.com/docs/pricing#embeddings

## Disk Usage Estimation

File Knowledge requires disk space for both the original files and the vector embeddings. The amount of disk space needed depends on the number of agents, files uploaded, and the embedding model used.

### Storage Components

1. **Original Files**: Stored according to the instance's binary file settings
   - Non-PDF files: Varies by file type and size
   - PDF files: Typically 50-200 KB per page (text-based PDFs)

2. **Vector Embeddings**: Stored in the database vector table
   - Chunk size: PDFs are split into chunks (typically 1000-2000 characters with overlap)
   - Embedding dimensions: Varies by provider
     - OpenAI text-embedding-3-small: 1536 dimensions (6 KB per vector)
     - OpenAI text-embedding-3-large: 3072 dimensions (12 KB per vector)
     - Google Gemini: 768 dimensions (3 KB per vector)
   - Metadata: Additional space for chunk text, references, and indexes

### Example Calculation

**Scenario**: 50 users, each creating 10 agents, each agent with 100 pages of text PDF

**Assumptions**:
- PDF size: 100 KB per page on average
- Chunks per page: ~2.5 chunks (based on typical page length and chunk size)
- Embedding model: OpenAI text-embedding-3-small (1536 dimensions)
- Float32 storage: 4 bytes per dimension

**Calculation**:
- Total pages: 50 users × 10 agents × 100 pages = 50,000 pages
- **PDF storage**: 50,000 pages × 100 KB = ~5 GB
- Total chunks: 50,000 pages × 2.5 chunks/page = 125,000 chunks
- **Embedding storage**: 125,000 chunks × (1536 dimensions × 4 bytes) = ~750 MB
- **Chunk text and metadata**: 125,000 chunks × ~2 KB = ~250 MB
- **Database indexes and overhead**: ~100-200 MB

**Total estimated disk usage**: ~6-7 GB

[To discuss: Should we keep the original PDF files? Not storing them would save ~70-77% of disk space, but prevents re-generating embeddings without re-upload (e.g., when switching providers or upgrading embedding models) and limits features like displaying source snippets or downloading original files.]

## Limitations

- The PDF file support processes text data only. Pictures, diagrams, graphs are not recognized. Table contents can be recognized but the quality will vary. Image PDFs are also not recognized [Possible solution for the future: improved text extraction, OCR, provider's native PDF support]
- [There should be per-agent limit to the estimated token consumption by non-PDF context files, otherwise context can be already exhausted at the beginning of conversation. TBU]
- [There should be per-user or instance wide size limit to how large files and the vector table can be; TBU]