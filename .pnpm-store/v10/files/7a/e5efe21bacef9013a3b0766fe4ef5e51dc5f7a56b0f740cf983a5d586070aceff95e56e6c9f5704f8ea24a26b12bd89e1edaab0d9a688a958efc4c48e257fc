---
title: Object generation failed with OpenAI
description: Troubleshooting NoObjectGeneratedError with finish-reason content-filter caused by incompatible Zod schema types when using OpenAI structured outputs
---

# Object generation failed with OpenAI

## Issue

When using structured output generation with OpenAI, you may encounter a `NoObjectGeneratedError` with the finish reason `content-filter`. This error occurs when your Zod schema contains incompatible types that OpenAI's structured output feature cannot process.

```typescript
// Problematic code - incompatible schema types
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o-2024-08-06'),
  output: Output.object({
    schema: z.object({
      name: z.string().nullish(), // ❌ .nullish() is not supported
      email: z.string().optional(), // ❌ .optional() is not supported
      age: z.number().nullable(), // ✅ .nullable() is supported
    }),
  }),
  prompt: 'Generate a user profile',
});

// Error: NoObjectGeneratedError: No object generated.
// Finish reason: content-filter
```

## Background

OpenAI's structured output generation uses JSON Schema under the hood and has specific requirements for schema compatibility. The Zod methods `.nullish()` and `.optional()` generate JSON Schema patterns that are incompatible with OpenAI's implementation, causing the model to reject the schema and return a content-filter finish reason.

## Solution

Replace `.nullish()` and `.optional()` with `.nullable()` in your Zod schemas when using structured output generation with OpenAI models.

```typescript
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Correct approach - use .nullable()
const result = await generateText({
  model: openai('gpt-4o-2024-08-06'),
  output: Output.object({
    schema: z.object({
      name: z.string().nullable(), // ✅ Use .nullable() instead of .nullish()
      email: z.string().nullable(), // ✅ Use .nullable() instead of .optional()
      age: z.number().nullable(),
    }),
  }),
  prompt: 'Generate a user profile',
});

console.log(result.output);
// { name: "John Doe", email: "john@example.com", age: 30 }
// or { name: null, email: null, age: 25 }
```

### Schema Type Comparison

| Zod Type      | Compatible | JSON Schema Behavior                                   |
| ------------- | ---------- | ------------------------------------------------------ |
| `.nullable()` | ✅ Yes     | Allows `null` or the specified type                    |
| `.optional()` | ❌ No      | Field can be omitted (not supported)                   |
| `.nullish()`  | ❌ No      | Allows `null`, `undefined`, or omitted (not supported) |

## Related Information

- For more details on structured output generation, see [Generating Structured Data](/docs/ai-sdk-core/generating-structured-data)
- For OpenAI-specific structured output configuration, see [OpenAI Provider - Structured Outputs](/providers/ai-sdk-providers/openai#structured-outputs)
