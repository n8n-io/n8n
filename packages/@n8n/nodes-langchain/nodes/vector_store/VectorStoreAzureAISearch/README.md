# Azure AI Search Vector Store Node

This node provides integration with Azure AI Search (formerly Azure Cognitive Search) as a vector store for n8n LangChain workflows.

## Features

- **Hybrid Search**: Combines vector similarity search with traditional keyword search
- **Semantic Search**: Optional semantic ranking for improved relevance (requires Basic tier or higher)
- **Multiple Authentication Methods**:
  - API Key authentication
  - System-assigned Managed Identity
  - User-assigned Managed Identity
- **Flexible Query Types**: Vector, hybrid, and semantic hybrid search
- **Advanced Filtering**: Support for OData filter expressions
- **Enterprise-grade**: Built on Azure AI Search for scalable, production-ready search

## Prerequisites

1. **Azure AI Search Service**: Create an Azure AI Search service in your Azure subscription
2. **Search Index**: Create or use an existing search index with vector fields configured
3. **Authentication**: Set up API key or Managed Identity authentication

## Configuration

### Credentials

Create an Azure AI Search credential with the following settings:

- **Authentication Method**: Choose from API Key, System-assigned MI, or User-assigned MI
- **Search Endpoint**: Your Azure AI Search service URL (e.g., `https://your-service.search.windows.net`)
- **API Key**: Required for API Key authentication
- **Client ID**: Required for User-assigned Managed Identity

### Node Parameters

- **Index Name**: Name of your Azure AI Search index
- **Query Type**:
  - `Vector`: Vector similarity search only
  - `Hybrid`: Combines vector and keyword search (recommended)
  - `Semantic Hybrid`: Hybrid search with semantic ranking
- **Results Count**: Number of results to return from Azure AI Search (default: 4)
- **Filter**: Optional OData filter expression (e.g., `category eq 'technology'`)
- **Semantic Configuration**: Optional name of the semantic configuration for semantic hybrid search (if not provided, semantic hybrid search will run without a specific configuration)

## Operation Modes

### Insert
Adds documents to the Azure AI Search index. Documents should include text content and any metadata fields defined in your index schema.

Options:
- **Clear Index**: Clear all documents before inserting new data
- **Batch Size**: Number of documents to upload in a single batch (default: 100)

### Retrieve
Performs search queries against the index and returns matching documents as a vector store connection for use with retrievers.

### Load
Executes search queries and returns results directly as workflow data.

### Retrieve as Tool
Creates a tool interface for LLM agents to search the vector store.

### Update
Updates existing documents in the index by ID.

## Example Workflows

### Basic Document Ingestion and Retrieval
1. **Document Loader** → **Text Splitter** → **Embeddings** → **Azure AI Search Vector Store (Insert)**
2. **Embeddings** → **Azure AI Search Vector Store (Retrieve)** → **Retriever** → **Chain**

### Hybrid Search with Filtering
Configure the retrieve operation with:
- Query Type: `Hybrid`
- Filter: `category eq 'documentation' and lastModified ge 2024-01-01`
- Results Count: `20`

## Best Practices

1. **Index Design**: Design your search index with appropriate vector dimensions matching your embedding model
2. **Semantic Configuration**: Set up semantic ranking in Azure portal for better relevance with semantic hybrid search
3. **Authentication**: Use Managed Identity in production environments for enhanced security
4. **Filter Optimization**: Use specific filters to improve search performance and relevance
5. **Batch Size**: When inserting documents, configure the batch size for uploading to Azure AI Search based on your service tier (this is separate from embedding batch size which is configured upstream)

## Troubleshooting

- **Authentication Errors**: Verify your credentials and ensure proper permissions
- **Index Not Found**: Confirm the index name exists in your Azure AI Search service
- **Semantic Search Errors**: Ensure semantic configuration is set up in Azure portal
- **Rate Limiting**: Azure AI Search has request limits based on your service tier

## Links

- [Azure AI Search Documentation](https://docs.microsoft.com/en-us/azure/search/)
- [LangChain Azure AI Search Integration](https://js.langchain.com/docs/integrations/vectorstores/azure_aisearch/)
- [OData Filter Syntax](https://docs.microsoft.com/en-us/odata/concepts/queryoptions-overview)