---
title: simulateReadableStream
description: Create a ReadableStream that emits values with configurable delays
---

# `simulateReadableStream()`

`simulateReadableStream` is a utility function that creates a ReadableStream which emits provided values sequentially with configurable delays. This is particularly useful for testing streaming functionality or simulating time-delayed data streams.

```ts
import { simulateReadableStream } from 'ai';

const stream = simulateReadableStream({
  chunks: ['Hello', ' ', 'World'],
  initialDelayInMs: 100,
  chunkDelayInMs: 50,
});
```

## Import

<Snippet text={`import { simulateReadableStream } from "ai"`} prompt={false} />

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'chunks',
      type: 'T[]',
      isOptional: false,
      description: 'Array of values to be emitted by the stream',
    },
    {
      name: 'initialDelayInMs',
      type: 'number | null',
      isOptional: true,
      description:
        'Initial delay in milliseconds before emitting the first value. Defaults to 0. Set to null to skip the initial delay entirely.',
    },
    {
      name: 'chunkDelayInMs',
      type: 'number | null',
      isOptional: true,
      description:
        'Delay in milliseconds between emitting each value. Defaults to 0. Set to null to skip delays between chunks.',
    },
  ]}
/>

### Returns

Returns a `ReadableStream<T>` that:

- Emits each value from the provided `chunks` array sequentially
- Waits for `initialDelayInMs` before emitting the first value (if not `null`)
- Waits for `chunkDelayInMs` between emitting subsequent values (if not `null`)
- Closes automatically after all chunks have been emitted

### Type Parameters

- `T`: The type of values contained in the chunks array and emitted by the stream

## Examples

### Basic Usage

```ts
const stream = simulateReadableStream({
  chunks: ['Hello', ' ', 'World'],
});
```

### With Delays

```ts
const stream = simulateReadableStream({
  chunks: ['Hello', ' ', 'World'],
  initialDelayInMs: 1000, // Wait 1 second before first chunk
  chunkDelayInMs: 500, // Wait 0.5 seconds between chunks
});
```

### Without Delays

```ts
const stream = simulateReadableStream({
  chunks: ['Hello', ' ', 'World'],
  initialDelayInMs: null, // No initial delay
  chunkDelayInMs: null, // No delay between chunks
});
```
