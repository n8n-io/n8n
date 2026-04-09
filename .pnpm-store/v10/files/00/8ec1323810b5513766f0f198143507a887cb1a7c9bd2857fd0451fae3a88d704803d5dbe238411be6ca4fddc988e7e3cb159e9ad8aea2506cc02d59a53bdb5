---
title: rerank
description: API Reference for rerank.
---

# `rerank()`

Rerank a set of documents based on their relevance to a query using a reranking model.

This is ideal for improving search relevance by reordering documents, emails, or other content based on semantic understanding of the query and documents.

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
});
```

## Import

<Snippet text={`import { rerank } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'model',
      type: 'RerankingModel',
      description:
        "The reranking model to use. Example: cohere.reranking('rerank-v3.5')",
    },
    {
      name: 'documents',
      type: 'Array<VALUE>',
      description:
        'The documents to rerank. Can be an array of strings or JSON objects.',
    },
    {
      name: 'query',
      type: 'string',
      description: 'The search query to rank documents against.',
    },
    {
      name: 'topN',
      type: 'number',
      isOptional: true,
      description:
        'Maximum number of top documents to return. If not specified, all documents are returned.',
    },
    {
      name: 'maxRetries',
      type: 'number',
      isOptional: true,
      description:
        'Maximum number of retries. Set to 0 to disable retries. Default: 2.',
    },
    {
      name: 'abortSignal',
      type: 'AbortSignal',
      isOptional: true,
      description:
        'An optional abort signal that can be used to cancel the call.',
    },
    {
      name: 'headers',
      type: 'Record<string, string>',
      isOptional: true,
      description:
        'Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.',
    },
    {
      name: 'providerOptions',
      type: 'ProviderOptions',
      isOptional: true,
      description: 'Provider-specific options for the reranking request.',
    },
    {
      name: 'experimental_telemetry',
      type: 'TelemetrySettings',
      isOptional: true,
      description: 'Telemetry configuration. Experimental feature.',
      properties: [
        {
          type: 'TelemetrySettings',
          parameters: [
            {
              name: 'isEnabled',
              type: 'boolean',
              isOptional: true,
              description:
                'Enable or disable telemetry. Disabled by default while experimental.',
            },
            {
              name: 'recordInputs',
              type: 'boolean',
              isOptional: true,
              description:
                'Enable or disable input recording. Enabled by default.',
            },
            {
              name: 'recordOutputs',
              type: 'boolean',
              isOptional: true,
              description:
                'Enable or disable output recording. Enabled by default.',
            },
            {
              name: 'functionId',
              type: 'string',
              isOptional: true,
              description:
                'Identifier for this function. Used to group telemetry data by function.',
            },
            {
              name: 'metadata',
              isOptional: true,
              type: 'Record<string, string | number | boolean | Array<null | undefined | string> | Array<null | undefined | number> | Array<null | undefined | boolean>>',
              description:
                'Additional information to include in the telemetry data.',
            },
            {
              name: 'tracer',
              type: 'Tracer',
              isOptional: true,
              description: 'A custom tracer to use for the telemetry data.',
            },
          ],
        },
      ],
    },
  ]}
/>

### Returns

<PropertiesTable
  content={[
    {
      name: 'originalDocuments',
      type: 'Array<VALUE>',
      description: 'The original documents array in their original order.',
    },
    {
      name: 'rerankedDocuments',
      type: 'Array<VALUE>',
      description: 'The documents sorted by relevance score (descending).',
    },
    {
      name: 'ranking',
      type: 'Array<RankingItem<VALUE>>',
      description: 'Array of ranking items with scores and indices.',
      properties: [
        {
          type: 'RankingItem<VALUE>',
          parameters: [
            {
              name: 'originalIndex',
              type: 'number',
              description:
                'The index of the document in the original documents array.',
            },
            {
              name: 'score',
              type: 'number',
              description:
                'The relevance score for the document (typically 0-1, where higher is more relevant).',
            },
            {
              name: 'document',
              type: 'VALUE',
              description: 'The document itself.',
            },
          ],
        },
      ],
    },
    {
      name: 'response',
      type: 'Response',
      description: 'Response data.',
      properties: [
        {
          type: 'Response',
          parameters: [
            {
              name: 'id',
              isOptional: true,
              type: 'string',
              description: 'The response ID from the provider.',
            },
            {
              name: 'timestamp',
              type: 'Date',
              description: 'The timestamp of the response.',
            },
            {
              name: 'modelId',
              type: 'string',
              description: 'The model ID used for reranking.',
            },
            {
              name: 'headers',
              isOptional: true,
              type: 'Record<string, string>',
              description: 'Response headers.',
            },
            {
              name: 'body',
              type: 'unknown',
              isOptional: true,
              description: 'The raw response body.',
            },
          ],
        },
      ],
    },
    {
      name: 'providerMetadata',
      type: 'ProviderMetadata | undefined',
      isOptional: true,
      description:
        'Optional metadata from the provider. The outer key is the provider name. The inner values are the metadata. Details depend on the provider.',
    },
  ]}
/>

## Examples

### String Documents

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking, rerankedDocuments } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: [
    'sunny day at the beach',
    'rainy afternoon in the city',
    'snowy night in the mountains',
  ],
  query: 'talk about rain',
  topN: 2,
});

console.log(rerankedDocuments);
// ['rainy afternoon in the city', 'sunny day at the beach']

console.log(ranking);
// [
//   { originalIndex: 1, score: 0.9, document: 'rainy afternoon...' },
//   { originalIndex: 0, score: 0.3, document: 'sunny day...' }
// ]
```

### Object Documents

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const documents = [
  {
    from: 'Paul Doe',
    subject: 'Follow-up',
    text: 'We are happy to give you a discount of 20%.',
  },
  {
    from: 'John McGill',
    subject: 'Missing Info',
    text: 'Here is the pricing from Oracle: $5000/month',
  },
];

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents,
  query: 'Which pricing did we get from Oracle?',
  topN: 1,
});

console.log(ranking[0].document);
// { from: 'John McGill', subject: 'Missing Info', ... }
```

### With Provider Options

```ts
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';

const { ranking } = await rerank({
  model: cohere.reranking('rerank-v3.5'),
  documents: ['sunny day at the beach', 'rainy afternoon in the city'],
  query: 'talk about rain',
  providerOptions: {
    cohere: {
      maxTokensPerDoc: 1000,
    },
  },
});
```
