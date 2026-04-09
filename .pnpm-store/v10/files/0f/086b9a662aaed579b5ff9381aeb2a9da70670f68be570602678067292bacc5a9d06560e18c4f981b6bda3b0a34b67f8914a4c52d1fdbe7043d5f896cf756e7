---
title: cosineSimilarity
description: Calculate the cosine similarity between two vectors (API Reference)
---

# `cosineSimilarity()`

When you want to compare the similarity of embeddings, standard vector similarity metrics
like cosine similarity are often used.

`cosineSimilarity` calculates the cosine similarity between two vectors.
A high value (close to 1) indicates that the vectors are very similar, while a low value (close to -1) indicates that they are different.

```ts
import { cosineSimilarity, embedMany } from 'ai';

const { embeddings } = await embedMany({
  model: 'openai/text-embedding-3-small',
  values: ['sunny day at the beach', 'rainy afternoon in the city'],
});

console.log(
  `cosine similarity: ${cosineSimilarity(embeddings[0], embeddings[1])}`,
);
```

## Import

<Snippet text={`import { cosineSimilarity } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'vector1',
      type: 'number[]',
      description: 'The first vector to compare',
    },
    {
      name: 'vector2',
      type: 'number[]',
      description: 'The second vector to compare',
    },
  ]}
/>

### Returns

A number between -1 and 1 representing the cosine similarity between the two vectors.
