---
title: extractJsonMiddleware
description: Middleware that extracts JSON from text content by stripping markdown code fences
---

# `extractJsonMiddleware()`

`extractJsonMiddleware` is a middleware function that extracts JSON from text content by stripping markdown code fences and other formatting. This is useful when using `Output.object()` with models that wrap JSON responses in markdown code blocks (e.g., ` ```json ... ``` `).

```ts
import { extractJsonMiddleware } from 'ai';

const middleware = extractJsonMiddleware();
```

## Import

<Snippet text={`import { extractJsonMiddleware } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'transform',
      type: '(text: string) => string',
      isOptional: true,
      description:
        'Custom transform function to apply to text content. Receives the raw text and should return the transformed text. If not provided, the default transform strips markdown code fences.',
    },
  ]}
/>

### Returns

Returns a middleware object that:

- Processes both streaming and non-streaming responses
- Strips markdown code fences (` ```json ` and ` ``` `) from text content
- Applies custom transformations when a `transform` function is provided
- Maintains proper streaming behavior with efficient buffering

## Usage Examples

### Basic Usage

Strip markdown code fences from model responses when using structured output:

```ts
import {
  generateText,
  wrapLanguageModel,
  extractJsonMiddleware,
  Output,
} from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: wrapLanguageModel({
    model: yourModel,
    middleware: extractJsonMiddleware(),
  }),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        name: z.string(),
        steps: z.array(z.string()),
      }),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
});

console.log(result.output);
```

### With Streaming

The middleware also works with streaming responses:

```ts
import {
  streamText,
  wrapLanguageModel,
  extractJsonMiddleware,
  Output,
} from 'ai';
import { z } from 'zod';

const { partialOutputStream } = streamText({
  model: wrapLanguageModel({
    model: yourModel,
    middleware: extractJsonMiddleware(),
  }),
  output: Output.object({
    schema: z.object({
      recipe: z.object({
        ingredients: z.array(z.string()),
        steps: z.array(z.string()),
      }),
    }),
  }),
  prompt: 'Generate a detailed recipe.',
});

for await (const partialObject of partialOutputStream) {
  console.log(partialObject);
}
```

### Custom Transform Function

For models that use different formatting, you can provide a custom transform:

```ts
import { extractJsonMiddleware } from 'ai';

const middleware = extractJsonMiddleware({
  transform: text =>
    text
      .replace(/^PREFIX/, '')
      .replace(/SUFFIX$/, '')
      .trim(),
});
```

## How It Works

The middleware handles text content in two ways:

### Non-Streaming (generateText)

1. Receives the complete response from the model
2. Applies the transform function to strip markdown fences (or custom formatting)
3. Returns the cleaned text content

### Streaming (streamText)

1. Buffers initial content to detect markdown fence prefixes (` ```json\n `)
2. If a fence is detected, strips the prefix and switches to streaming mode
3. Maintains a small suffix buffer to handle the closing fence (` \n``` `)
4. When the stream ends, strips any trailing fence from the buffer
5. For custom transforms, buffers all content and applies the transform at the end

This approach ensures efficient streaming while correctly handling code fences that may be split across multiple chunks.
