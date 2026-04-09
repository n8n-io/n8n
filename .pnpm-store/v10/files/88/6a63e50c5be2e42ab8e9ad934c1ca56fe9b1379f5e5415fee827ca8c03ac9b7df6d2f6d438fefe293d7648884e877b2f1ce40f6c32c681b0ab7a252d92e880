---
title: safeValidateUIMessages
description: API Reference for safeValidateUIMessages
---

# `safeValidateUIMessages`

`safeValidateUIMessages` is an async function that validates UI messages like [`validateUIMessages`](https://ai-sdk.dev/docs/reference/ai-sdk-core/validate-ui-messages), but instead of throwing it returns an object with a `success` key and either `data` or `error`.

## Basic Usage

Simple validation without custom schemas:

```typescript
import { safeValidateUIMessages } from 'ai';

const messages = [
  {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello!' }],
  },
];

const result = await safeValidateUIMessages({
  messages,
});

if (!result.success) {
  console.error(result.error.message);
} else {
  const validatedMessages = result.data;
}
```

## Advanced Usage

Comprehensive validation with custom metadata, data parts, and tools:

```typescript
import { safeValidateUIMessages, tool } from 'ai';
import { z } from 'zod';

// Define schemas
const metadataSchema = z.object({
  timestamp: z.string().datetime(),
  userId: z.string(),
});

const dataSchemas = {
  chart: z.object({
    data: z.array(z.number()),
    labels: z.array(z.string()),
  }),
  image: z.object({
    url: z.string().url(),
    caption: z.string(),
  }),
};

const tools = {
  weather: tool({
    description: 'Get weather info',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => `Weather in ${location}: sunny`,
  }),
};

// Messages with custom parts
const messages = [
  {
    id: '1',
    role: 'user',
    metadata: { timestamp: '2024-01-01T00:00:00Z', userId: 'user123' },
    parts: [
      { type: 'text', text: 'Show me a chart' },
      {
        type: 'data-chart',
        data: { data: [1, 2, 3], labels: ['A', 'B', 'C'] },
      },
    ],
  },
  {
    id: '2',
    role: 'assistant',
    parts: [
      {
        type: 'tool-weather',
        toolCallId: 'call_123',
        state: 'output-available',
        input: { location: 'San Francisco' },
        output: 'Weather in San Francisco: sunny',
      },
    ],
  },
];

// Validate with all schemas
const result = await safeValidateUIMessages({
  messages,
  metadataSchema,
  dataSchemas,
  tools,
});

if (!result.success) {
  console.error(result.error.message);
} else {
  const validatedMessages = result.data;
}
```
