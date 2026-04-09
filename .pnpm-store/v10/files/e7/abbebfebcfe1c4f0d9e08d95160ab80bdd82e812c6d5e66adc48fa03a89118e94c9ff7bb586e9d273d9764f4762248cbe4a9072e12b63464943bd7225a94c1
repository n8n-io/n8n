---
title: extractReasoningMiddleware
description: Middleware that extracts XML-tagged reasoning sections from generated text
---

# `extractReasoningMiddleware()`

`extractReasoningMiddleware` is a middleware function that extracts XML-tagged reasoning sections from generated text and exposes them separately from the main text content. This is particularly useful when you want to separate an AI model's reasoning process from its final output.

```ts
import { extractReasoningMiddleware } from 'ai';

const middleware = extractReasoningMiddleware({
  tagName: 'reasoning',
  separator: '\n',
});
```

## Import

<Snippet
  text={`import { extractReasoningMiddleware } from "ai"`}
  prompt={false}
/>

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'tagName',
      type: 'string',
      isOptional: false,
      description:
        'The name of the XML tag to extract reasoning from (without angle brackets)',
    },
    {
      name: 'separator',
      type: 'string',
      isOptional: true,
      description:
        'The separator to use between reasoning and text sections. Defaults to "\\n"',
    },
    {
      name: 'startWithReasoning',
      type: 'boolean',
      isOptional: true,
      description:
        'Starts with reasoning tokens. Set to true when the response always starts with reasoning and the initial tag is omitted. Defaults to false.',
    },
  ]}
/>

### Returns

Returns a middleware object that:

- Processes both streaming and non-streaming responses
- Extracts content between specified XML tags as reasoning
- Removes the XML tags and reasoning from the main text
- Adds a `reasoning` property to the result containing the extracted content
- Maintains proper separation between text sections using the specified separator

### Type Parameters

The middleware works with the `LanguageModelV3StreamPart` type for streaming responses.
