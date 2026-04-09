---
title: simulateStreamingMiddleware
description: Middleware that simulates streaming for non-streaming language models
---

# `simulateStreamingMiddleware()`

`simulateStreamingMiddleware` is a middleware function that simulates streaming behavior with responses from non-streaming language models. This is useful when you want to maintain a consistent streaming interface even when using models that only provide complete responses.

```ts
import { simulateStreamingMiddleware } from 'ai';

const middleware = simulateStreamingMiddleware();
```

## Import

<Snippet
  text={`import { simulateStreamingMiddleware } from "ai"`}
  prompt={false}
/>

## API Signature

### Parameters

This middleware doesn't accept any parameters.

### Returns

Returns a middleware object that:

- Takes a complete response from a language model
- Converts it into a simulated stream of chunks
- Properly handles various response components including:
  - Text content
  - Reasoning (as string or array of objects)
  - Tool calls
  - Metadata and usage information
  - Warnings

### Usage Example

```ts
import { streamText } from 'ai';
import { wrapLanguageModel } from 'ai';
import { simulateStreamingMiddleware } from 'ai';

// Example with a non-streaming model
const result = streamText({
  model: wrapLanguageModel({
    model: nonStreamingModel,
    middleware: simulateStreamingMiddleware(),
  }),
  prompt: 'Your prompt here',
});

// Now you can use the streaming interface
for await (const chunk of result.fullStream) {
  // Process streaming chunks
}
```

## How It Works

The middleware:

1. Awaits the complete response from the language model
2. Creates a `ReadableStream` that emits chunks in the correct sequence
3. Simulates streaming by breaking down the response into appropriate chunk types
4. Preserves all metadata, reasoning, tool calls, and other response properties
