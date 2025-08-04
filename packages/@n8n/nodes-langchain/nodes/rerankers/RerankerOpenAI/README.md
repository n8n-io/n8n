# OpenAI-Compatible Reranker Node for n8n

This directory contains the implementation of an OpenAI-compatible reranker node for n8n's LangChain integration.

## Overview

The OpenAI Reranker node allows users to reorder documents after retrieval from a vector store by relevance to a given query using any OpenAI-compatible reranking API.

## Features

- **OpenAI-Compatible API Support**: Works with any service that implements OpenAI-compatible reranker APIs
- **Configurable Endpoint**: Users can specify custom API URLs (not limited to OpenAI)
- **Flexible Model Selection**: Supports any model name through configuration
- **Customizable Top-K**: Allows users to specify the maximum number of documents to return
- **Error Handling**: Gracefully falls back to original document order on API errors

## Files

- `RerankerOpenAI.node.ts` - Main node implementation
- `openai.svg` - Light theme icon
- `openai.dark.svg` - Dark theme icon
- `test/RerankerOpenAI.node.test.ts` - Unit tests
- `README.md` - This documentation file

## Configuration

### Credentials (OpenAI API)

The node requires the following credentials:

- **API Key**: Authentication key for the reranking service
- **Base URL**: The base URL for the API endpoint (e.g., `https://api.openai.com`)
- **Model Name**: Default model name to use for reranking

### Node Parameters

- **Model**: Override the model name from credentials (optional)
- **Top K**: Maximum number of documents to return after reranking (default: 10)

## API Compatibility

The implementation expects the reranking API to follow this format:

### Request
```json
POST /v1/rerank
{
  "model": "rerank-1",
  "query": "search query",
  "documents": ["document 1", "document 2", ...],
  "top_k": 10
}
```

### Response
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

## Usage

1. Configure the OpenAI API credentials with your endpoint details
2. Add the Reranker OpenAI node to your workflow
3. Connect it to your retrieval chain
4. Configure the model name and top-k parameters as needed

## Error Handling

If the API request fails or returns an unexpected format, the node will:
1. Log the error for debugging
2. Return the original documents in their original order
3. Continue the workflow execution

This ensures that workflows remain robust even when the reranking service is unavailable.

## Testing

Run the unit tests with:
```bash
npm test -- RerankerOpenAI.node.test.ts
```

## Implementation Notes

- The node extends `BaseDocumentCompressor` from LangChain
- Documents are ranked by relevance score in descending order
- Original document metadata is preserved and enhanced with relevance scores
- The implementation is designed to be compatible with various OpenAI-compatible reranking services
