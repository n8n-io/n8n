---
title: readUIMessageStream
description: API Reference for readUIMessageStream.
---

# readUIMessageStream

Transforms a stream of `UIMessageChunk`s into an `AsyncIterableStream` of `UIMessage`s.

UI message streams are useful outside of Chat use cases, e.g. for terminal UIs, custom stream consumption on the client, or RSC (React Server Components).

## Import

```tsx
import { readUIMessageStream } from 'ai';
```

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'message',
      type: 'UIMessage',
      isOptional: true,
      description:
        'The last assistant message to use as a starting point when the conversation is resumed. Otherwise undefined.',
    },
    {
      name: 'stream',
      type: 'ReadableStream<UIMessageChunk>',
      description: 'The stream of UIMessageChunk objects to read.',
    },
    {
      name: 'onError',
      type: '(error: unknown) => void',
      isOptional: true,
      description:
        'A function that is called when an error occurs during stream processing.',
    },
    {
      name: 'terminateOnError',
      type: 'boolean',
      isOptional: true,
      description:
        'Whether to terminate the stream if an error occurs. Defaults to false.',
    },
  ]}
/>

### Returns

An `AsyncIterableStream` of `UIMessage`s. Each stream part represents a different state of the same message as it is being completed.

For comprehensive examples and use cases, see [Reading UI Message Streams](/docs/ai-sdk-ui/reading-ui-message-streams).
