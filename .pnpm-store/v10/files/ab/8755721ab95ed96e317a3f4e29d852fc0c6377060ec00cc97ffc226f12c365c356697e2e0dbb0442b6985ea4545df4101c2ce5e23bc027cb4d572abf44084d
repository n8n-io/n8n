---
title: Reranking
description: Learn how to rerank documents with the AI SDK.
---

# Reranking

Reranking is a technique used to improve search relevance by reordering a set of documents based on their relevance to a query.
Unlike embedding-based similarity search, reranking models are specifically trained to understand the relationship between queries and documents,
often producing more accurate relevance scores.

## Reranking Documents

The AI SDK provides the [`rerank`](/docs/reference/ai-sdk-core/rerank) function to rerank documents based on their relevance to a query.
You can use it with reranking models, e.g. `cohere.reranking('rerank-v3.5')` or `bedrock.reranking('cohere.rerank-v3-5:0')`.

```tsx
import { rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';

const documents = [
  'sunny day at the beach',
  'rainy afternoon in the city',
  'snowy night in the mountains',
];

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents,
  query: 'talk about rain',
  topN: 2, // Return top 2 most relevant documents
});

console.log(ranking);
// [
//   { originalIndex: 1, score: 0.9, document: 'rainy afternoon in the city' },
//   { originalIndex: 0, score: 0.3, document: 'sunny day at the beach' }
// ]
```

## Working with Object Documents

Reranking also supports structured documents (JSON objects), making it ideal for searching through databases, emails, or other structured content:

```tsx
import { rerank } from 'ai';
import { cohere } from '@ai-sdk/cohere';

const documents = [
  {
    from: 'Paul Doe',
    subject: 'Follow-up',
    text: 'We are happy to give you a discount of 20% on your next order.',
  },
  {
    from: 'John McGill',
    subject: 'Missing Info',
    text: 'Sorry, but here is the pricing information from Oracle: $5000/month',
  },
];

const { ranking, rerankedDocuments } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents,
  query: 'Which pricing did we get from Oracle?',
  topN: 1,
});

console.log(rerankedDocuments[0]);
// { from: 'John McGill', subject: 'Missing Info', text: '...' }
```

## Understanding the Results

The `rerank` function returns a comprehensive result object:

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking, rerankedDocuments, originalDocuments } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
});

// ranking: sorted array of { originalIndex, score, document }
// rerankedDocuments: documents sorted by relevance (convenience property)
// originalDocuments: original documents array
```

Each item in the `ranking` array contains:

- `originalIndex`: Position in the original documents array
- `score`: Relevance score (typically 0-1, where higher is more relevant)
- `document`: The original document

## Settings

### Top-N Results

Use `topN` to limit the number of results returned. This is useful for retrieving only the most relevant documents:

```ts highlight={"7"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
  query: 'relevant information',
  topN: 3, // Return only top 3 most relevant documents
});
```

### Provider Options

Reranking model settings can be configured using `providerOptions` for provider-specific parameters:

```ts highlight={"8-12"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  providerOptions: {
    cohere: {
      maxTokensPerDoc: 1000, // Limit tokens per document
    },
  },
});
```

### Retries

The `rerank` function accepts an optional `maxRetries` parameter of type `number`
that you can use to set the maximum number of retries for the reranking process.
It defaults to `2` retries (3 attempts in total). You can set it to `0` to disable retries.

```ts highlight={"7"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  maxRetries: 0, // Disable retries
});
```

### Abort Signals and Timeouts

The `rerank` function accepts an optional `abortSignal` parameter of
type [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
that you can use to abort the reranking process or set a timeout.

```ts highlight={"7"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  abortSignal: AbortSignal.timeout(5000), // Abort after 5 seconds
});
```

### Custom Headers

The `rerank` function accepts an optional `headers` parameter of type `Record<string, string>`
that you can use to add custom headers to the reranking request.

```ts highlight={"7"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  headers: { 'X-Custom-Header': 'custom-value' },
});
```

## Response Information

The `rerank` function returns response information that includes the raw provider response:

```ts highlight={"4,10"}
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking, response } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
});

console.log(response); // { id, timestamp, modelId, headers, body }
```

## Reranking Providers & Models

Several providers offer reranking models:

| Provider                                                                      | Model                                 |
| ----------------------------------------------------------------------------- | ------------------------------------- |
| [Cohere](/providers/ai-sdk-providers/cohere#reranking-models)                 | `rerank-v3.5`                         |
| [Cohere](/providers/ai-sdk-providers/cohere#reranking-models)                 | `rerank-english-v3.0`                 |
| [Cohere](/providers/ai-sdk-providers/cohere#reranking-models)                 | `rerank-multilingual-v3.0`            |
| [Amazon Bedrock](/providers/ai-sdk-providers/amazon-bedrock#reranking-models) | `amazon.rerank-v1:0`                  |
| [Amazon Bedrock](/providers/ai-sdk-providers/amazon-bedrock#reranking-models) | `cohere.rerank-v3-5:0`                |
| [Together.ai](/providers/ai-sdk-providers/togetherai#reranking-models)        | `Salesforce/Llama-Rank-v1`            |
| [Together.ai](/providers/ai-sdk-providers/togetherai#reranking-models)        | `mixedbread-ai/Mxbai-Rerank-Large-V2` |
