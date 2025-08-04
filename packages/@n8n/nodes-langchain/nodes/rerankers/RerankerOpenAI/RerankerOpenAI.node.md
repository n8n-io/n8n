# Reranker OpenAI

The Reranker OpenAI node allows you to reorder documents retrieved from a vector store by their relevance to a given query using OpenAI-compatible reranking APIs.

## Node Reference

### Credentials

This node requires [OpenAI API credentials](../../../credentials/OpenAIApi.credentials.md).

### Parameters

#### Model
- **Type**: String
- **Required**: Yes
- **Default**: `rerank-1`
- **Description**: The model that should be used to rerank the documents. Specify the exact model name as provided by your OpenAI-compatible API service.

#### Top N
- **Type**: Number
- **Default**: 10
- **Range**: 1-100
- **Description**: Maximum number of documents to return after reranking. The reranker will return the top N most relevant documents based on their relevance scores.

## Usage

### Basic Setup

1. **Add the Reranker OpenAI node** to your workflow
2. **Configure credentials**: Set up your OpenAI API credentials with:
   - **API Key**: Your API key for the OpenAI-compatible service
   - **Base URL**: The base URL for your API endpoint (e.g., `https://api.siliconflow.cn`)
3. **Set the model name**: Specify the reranking model you want to use
4. **Configure Top N**: Set the maximum number of documents to return

### Connection

The Reranker OpenAI node should be connected to a Vector Store node that has the "Use Reranker" option enabled:

```
Vector Store (with "Use Reranker" enabled) → Reranker OpenAI → AI Agent
```

### Example Workflow

Here's a typical workflow using the Reranker OpenAI node:

1. **Chat Trigger**: Receives user queries
2. **Vector Store**: Retrieves similar documents (e.g., top 10)
3. **Reranker OpenAI**: Reranks and returns top 3 most relevant documents
4. **AI Agent**: Uses the reranked documents to generate responses

## Supported APIs

This node works with any OpenAI-compatible reranking API that supports the following endpoint:

```
POST /v1/rerank
```

### Request Format
```json
{
  "model": "your-model-name",
  "query": "user query",
  "documents": ["document 1", "document 2", "..."],
  "top_n": 3
}
```

### Response Format
```json
{
  "results": [
    {
      "index": 0,
      "relevance_score": 0.95
    },
    {
      "index": 2,
      "relevance_score": 0.87
    }
  ]
}
```

## Compatible Services

- **SiliconFlow**: Use models like `Qwen/Qwen3-Reranker-8B`
- **OpenAI**: When reranking APIs become available
- **Custom APIs**: Any service implementing the OpenAI reranking API format

## Best Practices

### Model Selection
- Choose models appropriate for your content language and domain
- Consider model size vs. performance trade-offs
- Test different models to find the best fit for your use case

### Top N Configuration
- Set Top N based on your downstream processing needs
- Higher values provide more options but may include less relevant documents
- Lower values focus on the most relevant documents but may miss important information

### Performance Optimization
- Use reranking after initial vector similarity search to improve relevance
- Consider the cost implications of reranking large document sets
- Monitor token usage and adjust Top N accordingly

## Troubleshooting

### Common Issues

**"The resource you are requesting could not be found"**
- Verify your Base URL is correct and doesn't include the `/v1/rerank` path
- Check that your API key has the necessary permissions
- Ensure the model name is exactly as specified by your API provider

**"No documents returned"**
- Check that the Vector Store has "Use Reranker" enabled
- Verify the Reranker node is properly connected to the Vector Store
- Ensure your query returns documents from the Vector Store

**"HTTP error! status: 429"**
- You've hit rate limits; implement retry logic or reduce request frequency
- Consider upgrading your API plan if needed

### Debug Tips

1. **Check API connectivity**: Test your credentials with a simple API call
2. **Verify document flow**: Ensure documents are flowing from Vector Store to Reranker
3. **Monitor token usage**: Check your API dashboard for usage patterns
4. **Test with simple queries**: Start with basic queries to verify functionality

## Related Nodes

- [Vector Store MongoDB Atlas](../../vector_store/VectorStoreMongoDBAtlas/VectorStoreMongoDBAtlas.node.md)
- [Vector Store Pinecone](../../vector_store/VectorStorePinecone/VectorStorePinecone.node.md)
- [Reranker Cohere](../RerankerCohere/RerankerCohere.node.md)
- [AI Agent](../../agent/Agent.node.md)
