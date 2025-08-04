# Reranker OpenAI Examples

This directory contains example workflows demonstrating how to use the Reranker OpenAI node in various scenarios.

## Basic RAG Workflow

**File**: `basic-rag-workflow.json`

This example demonstrates a complete Retrieval-Augmented Generation (RAG) workflow using the Reranker OpenAI node to improve document relevance.

### Workflow Overview

1. **Chat Trigger**: Receives user queries through a chat interface
2. **OpenAI Embeddings**: Converts text to vector embeddings for similarity search
3. **OpenAI Chat Model**: Provides the language model for generating responses
4. **MongoDB Atlas Vector Store**: 
   - Retrieves top 10 similar documents using vector search
   - Has "Use Reranker" option enabled
5. **Reranker OpenAI**: 
   - Reranks the 10 documents by relevance to the query
   - Returns the top 3 most relevant documents
6. **AI Agent**: Uses the reranked documents to generate contextual responses

### Setup Instructions

#### 1. Import the Workflow
1. Copy the contents of `basic-rag-workflow.json`
2. In n8n, go to **Workflows** → **Import from JSON**
3. Paste the JSON and import

#### 2. Configure Credentials

**OpenAI API Credentials** (for embeddings and chat model):
- **Name**: `OpenAI API`
- **API Key**: Your OpenAI API key
- **Base URL**: `https://api.openai.com`

**SiliconFlow API Credentials** (for reranker):
- **Name**: `SiliconFlow API`
- **API Key**: Your SiliconFlow API key
- **Base URL**: `https://api.siliconflow.cn`

**MongoDB Atlas Credentials**:
- **Name**: `MongoDB Atlas`
- **Connection String**: Your MongoDB Atlas connection string
- **Database**: Your database name

#### 3. Configure Vector Store
- **Collection**: `documents`
- **Embedding Field**: `embedding_vector`
- **Metadata Field**: `content`
- **Vector Index**: `vector_index`
- **Top K**: `10` (retrieves 10 documents for reranking)
- **Use Reranker**: ✅ **Enabled**

#### 4. Configure Reranker
- **Model**: `Qwen/Qwen3-Reranker-8B`
- **Top N**: `3` (returns top 3 reranked documents)

### Expected Behavior

1. **User Query**: "What is machine learning?"
2. **Vector Search**: Retrieves 10 potentially relevant documents
3. **Reranking**: Reranks documents by relevance, returns top 3
4. **Response Generation**: AI agent uses the 3 most relevant documents to generate a comprehensive answer

### Performance Benefits

- **Improved Relevance**: Reranking ensures the most relevant documents are used
- **Cost Efficiency**: Only top 3 documents are processed by the language model
- **Better Responses**: Higher quality context leads to more accurate answers

## Customization Options

### Different Reranking Models

You can experiment with different models by changing the `modelName` parameter:

```json
{
  "modelName": "BAAI/bge-reranker-v2-m3"
}
```

### Adjusting Document Counts

- **Vector Store Top K**: Increase for broader initial search (e.g., 20)
- **Reranker Top N**: Adjust based on context window and cost considerations (e.g., 5)

### Multiple Rerankers

For advanced use cases, you can chain multiple rerankers or use different rerankers for different document types.

## Troubleshooting

### Common Issues

**Reranker not being called**:
- Ensure "Use Reranker" is enabled in the Vector Store
- Verify the Reranker node is connected to the Vector Store's `ai_reranker` input
- Check that credentials are properly configured

**No documents returned**:
- Verify your MongoDB collection has documents with embeddings
- Check that the vector index is properly configured
- Ensure the embedding dimensions match

**API errors**:
- Verify API keys are correct and have sufficient credits
- Check that the model name is exactly as specified by the provider
- Ensure base URLs are correct (no trailing slashes or paths)

### Debug Tips

1. **Test Vector Store separately**: Disable reranker temporarily to verify document retrieval
2. **Check API connectivity**: Test credentials in the credential configuration
3. **Monitor token usage**: Check your API dashboard for usage patterns
4. **Start simple**: Begin with basic queries and gradually increase complexity

## Related Examples

- **Multi-language RAG**: Using rerankers with multilingual content
- **Domain-specific Reranking**: Optimizing for specific industries or topics
- **Hybrid Search**: Combining keyword and vector search with reranking

## Contributing

To contribute additional examples:

1. Create a new JSON workflow file
2. Add comprehensive documentation
3. Include setup instructions and troubleshooting tips
4. Test thoroughly with different scenarios
