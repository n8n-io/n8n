import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class KnowledgeBaseBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.KNOWLEDGE_BASE;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Knowledge Base Workflows

## Workflow Design

### Architecture Pattern
- **Separate Workflows**: Split into two distinct parts:
  - **Ingestion Workflow**: Processes and indexes documents into vector database (triggered on new content or schedule)
  - **Query Workflow**: Retrieves relevant information and generates answers (triggered by user queries)
- **Modular Design**: Use Execute Workflow node to call query workflow from multiple channels (chat, API, Slack, etc.)

### Trigger Strategy
- **Ingestion Triggers**: File Watchers (Google Drive, S3), Schedule triggers for periodic re-indexing
- **Query Triggers**: Chat Trigger, Webhook, Slack Trigger based on input channel

### Data Type Handling
- Use Switch/If nodes or Code node to route different file types to appropriate extraction branches
- Separate processing paths for PDFs, databases, web pages, etc.

## Core Processing Pipeline

### Document Processing
1. **Fetch Documents**: Google Drive/Dropbox/S3 nodes, HTTP Request node, Database nodes
2. **Load & Split**: Default Data Loader → Recursive Character Text Splitter
   - Chunk size: 500-1000 characters (~200 tokens)
   - Overlap: 10-15% to preserve context
3. **Generate Embeddings**: Embeddings node (OpenAI/HuggingFace/Cohere)
   - **Critical**: Use same model for indexing and queries
   - Example: text-embedding-ada-002 (1536 dimensions)

### Vector Store Configuration
- **Insert Mode**:
  - Use upsert with unique IDs (document ID + chunk number)
  - Include metadata (source, title, page number)
  - Clear namespace option for complete replacement
- **Query Mode**:
  - Top-K limit: 3-5 results typically optimal
  - Apply similarity score threshold to filter irrelevant matches

### LLM Integration
- **Agent Approach**: AI Agent node with Vector Store Tool
  - Configure clear tool description: "Company Knowledge Base – use this to find relevant policy documents"
  - Connect Window Buffer Memory for conversation history
- **Direct Query**: Vector Store (Get Many) → OpenAI Chat Model with crafted prompt
- **System Prompt**: "Answer using only the information from our knowledge base. If you don't find an answer in the provided documents, say you don't know."
- **Temperature**: 0-0.3 for factual accuracy

## Recommended Nodes

### Document Handling

**Google Drive** (n8n-nodes-base.googleDrive):
- Purpose: File triggers and retrieval from Google Drive
- Use cases: Monitor folders for new documents, fetch specific files
- Best practices: Use triggers for automatic ingestion, handle file types appropriately

**HTTP Request** (n8n-nodes-base.httpRequest):
- Purpose: Fetch documents from URLs/APIs
- Use cases: Pull content from web pages, download files from APIs
- Best practices: Handle authentication, check response formats

**Notion** (n8n-nodes-base.notion):
- Purpose: Retrieve content from Notion databases and pages
- Use cases: Index company wikis, documentation in Notion
- Best practices: Use appropriate API version, handle nested content

**Postgres** (n8n-nodes-base.postgres):
- Purpose: Query database content for indexing
- Use cases: Index structured data, retrieve records for embedding
- Best practices: Use efficient queries, batch large datasets

### AI Processing Chain

**Document Default Data Loader** (@n8n/n8n-nodes-langchain.documentDefaultDataLoader):
- Purpose: Load documents into LangChain format
- Use cases: Initial document processing, format conversion
- Best practices: Handle various document types, preserve metadata

**Text Splitter Recursive Character** (@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter):
- Purpose: Split documents into manageable chunks
- Configuration:
  - Chunk size: 500-1000 characters (~200 tokens)
  - Overlap: 10-15% to preserve context
- Best practices: Test chunk sizes for optimal retrieval quality, ensure context preservation

**Embeddings OpenAI** (@n8n/n8n-nodes-langchain.embeddingsOpenAi):
- Purpose: Generate vector embeddings for text
- Model options:
  - text-embedding-3-small (newer, cost-effective)
  - text-embedding-ada-002 (1536 dimensions, widely used)
- **Critical**: Use same model for indexing and queries
- Best practices: Choose model based on quality/cost tradeoffs, maintain consistency

### Vector Stores

**Vector Store Pinecone** (@n8n/n8n-nodes-langchain.vectorStorePinecone):
- Purpose: Pinecone vector database integration
- Use cases: Production knowledge bases, scalable deployments
- Best practices: Use namespaces for organization, set appropriate index dimensions

**Vector Store Qdrant** (@n8n/n8n-nodes-langchain.vectorStoreQdrant):
- Purpose: Qdrant vector database integration
- Use cases: Self-hosted vector storage, high-performance search
- Best practices: Configure collections properly, use filters for metadata

**Vector Store Supabase** (@n8n/n8n-nodes-langchain.vectorStoreSupabase):
- Purpose: Supabase pgvector integration
- Use cases: PostgreSQL-based vector storage, integrated with existing Supabase projects
- Best practices: Ensure pgvector extension is enabled, use proper indexing

**Vector Store In Memory** (@n8n/n8n-nodes-langchain.vectorStoreInMemory):
- Purpose: In-memory vector storage for testing
- Use cases: Development, testing, small datasets
- Best practices: Not for production, data lost on restart

### Agent & LLM

**AI Agent** (@n8n/n8n-nodes-langchain.agent):
- Purpose: Orchestrate tool use and LLM interactions
- Configuration: Connect Vector Store Tool, add memory
- Best practices: Configure clear tool descriptions, use appropriate prompts

**Tool Vector Store** (@n8n/n8n-nodes-langchain.toolVectorStore):
- Purpose: Vector store tool for agents
- Configuration: "Company Knowledge Base – use this to find relevant policy documents"
- Best practices: Use descriptive tool names, set appropriate retrieval limits (3-5 results)

**OpenAI** (@n8n/n8n-nodes-langchain.openAi):
- Purpose: Chat model for generating responses
- Configuration:
  - Temperature: 0-0.3 for factual Q&A
  - System prompt: "Answer using only the information from our knowledge base"
- Best practices: Use low temperature for accuracy, instruct to admit when unsure

**Memory Window Buffer** (@n8n/n8n-nodes-langchain.memoryBufferWindow):
- Purpose: Maintain conversation history
- Configuration: 3-5 message turns typically sufficient
- Best practices: Balance context preservation with token limits

### Utility

**Switch** (n8n-nodes-base.switch):
- Purpose: Route by file type or content type
- Use cases: Different processing for PDFs vs text vs images
- Best practices: Always define default case, use clear conditions

**Execute Workflow** (n8n-nodes-base.executeWorkflow):
- Purpose: Call sub-workflows for modular design
- Use cases: Reuse query workflow across channels, separate ingestion logic
- Best practices: Design for reusability, pass appropriate parameters

## Common Pitfalls to Avoid

### Critical Mistakes

**Inconsistent Embeddings**:
- **Problem**: Using different embedding models for indexing vs queries breaks semantic search
- **Solution**: Always use the same model throughout (e.g., text-embedding-ada-002 for both)
- Document which model is used in workflow description

**Vector Dimension Mismatch**:
- **Problem**: Index dimensions don't match embedding model output, causing errors
- **Solution**: Ensure vector store index dimensions match embedding model output exactly
- Common: ada-002 = 1536 dimensions, text-embedding-3-small = 1536 dimensions

**Missing Updates**:
- **Problem**: Not updating or removing outdated vectors leads to conflicting information
- **Solution**: Implement update/delete mechanisms with unique IDs
- Use document ID + chunk number as unique identifier
- Schedule regular re-indexing for changing content

**Treating Vector DB as Full Database**:
- **Problem**: Using vector stores for general data storage instead of semantic search
- **Solution**: Vector DBs are for semantic search only, not bulk data storage
- Store full documents in traditional databases, only embeddings in vector store

### Performance Issues

**Oversized Chunks**:
- **Problem**: Large chunks dilute relevance and exceed token limits
- **Solution**: Keep chunks to 500-1000 characters (~200 tokens)
- Test different sizes to find optimal retrieval quality

**Undersized Chunks**:
- **Problem**: Too small chunks lose necessary context
- **Solution**: Ensure chunks have sufficient context to be meaningful
- Use 10-15% overlap between chunks

**Too Many Retrieved Documents**:
- **Problem**: Retrieving 10+ documents overwhelms LLM and reduces accuracy
- **Solution**: Limit to 3-5 results for optimal quality
- Use similarity thresholds to filter irrelevant matches

**UI Overload**:
- **Problem**: Indexing thousands of chunks freezes workflow editor
- **Solution**: Run large indexing jobs in production mode, not editor
- Consider batch processing for very large datasets

### Configuration Errors

**No Metadata**:
- **Problem**: Missing source/date metadata makes results less interpretable
- **Solution**: Always include metadata (source, title, page number, date)
- Helps users understand context of retrieved information

**No Unique IDs**:
- **Problem**: Can't update specific documents, causes duplicates
- **Solution**: Use document ID + chunk number as unique identifier
- Enables targeted updates and deletions

**High Temperature**:
- **Problem**: Creative temperature settings cause hallucinations in factual Q&A
- **Solution**: Use temperature 0-0.3 for factual responses
- Higher temperatures (0.7-1.0) only for creative tasks

**Generic Tool Descriptions**:
- **Problem**: Vague descriptions cause agents to misuse tools
- **Solution**: Use specific, descriptive tool names
- Good: "Company HR Policy Knowledge Base"
- Bad: "Knowledge base"

### Data Management

**Stale Data**:
- **Problem**: Outdated information in knowledge base leads to wrong answers
- **Solution**: Schedule regular re-indexing or implement change detection
- Use document timestamps to track freshness

**No Namespace Separation**:
- **Problem**: Mixing unrelated domains in same index reduces accuracy
- **Solution**: Use namespaces to separate different knowledge domains
- Example: "hr-policies", "technical-docs", "customer-faqs"

**Ignoring Token Limits**:
- **Problem**: Combined length of query + context + response exceeds model limits
- **Solution**: Monitor total token usage, limit context appropriately
- GPT-4: 8k/32k tokens, GPT-3.5: 4k/16k tokens

**Security Gaps**:
- **Problem**: Sending sensitive data without access control or encryption
- **Solution**: Implement proper access controls, use secure connections
- Consider data classification and access restrictions

## Best Practices Summary

1. **Always use consistent embedding models** throughout the pipeline
2. **Design modular workflows** for reusability across channels
3. **Include metadata** for better context and filtering
4. **Implement proper update/delete mechanisms** with unique IDs
5. **Test chunk sizes** for optimal retrieval quality (500-1000 characters)
6. **Run large indexing operations** in production mode
7. **Set appropriate retrieval limits** (3-5 results) and similarity thresholds
8. **Use low temperature** (0-0.3) for factual responses
9. **Secure sensitive data** with proper access controls
10. **Monitor and update** regularly to prevent stale information
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
