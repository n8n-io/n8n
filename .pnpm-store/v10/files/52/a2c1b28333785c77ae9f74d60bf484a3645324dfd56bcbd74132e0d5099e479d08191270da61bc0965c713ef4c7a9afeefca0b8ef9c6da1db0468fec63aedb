---
title: readStreamableValue
description: Reference for the readStreamableValue function from the AI SDK RSC
---

# `readStreamableValue`

<Note type="warning">
  AI SDK RSC is currently experimental. We recommend using [AI SDK
  UI](/docs/ai-sdk-ui/overview) for production. For guidance on migrating from
  RSC to UI, see our [migration guide](/docs/ai-sdk-rsc/migrating-to-ui).
</Note>

It is a function that helps you read the streamable value from the client that was originally created using [`createStreamableValue`](/docs/reference/ai-sdk-rsc/create-streamable-value) on the server.

## Import

<Snippet
  text={`import { readStreamableValue } from "@ai-sdk/rsc"`}
  prompt={false}
/>

## Example

```ts filename="app/actions.ts"
async function generate() {
  'use server';
  const streamable = createStreamableValue('');

  streamable.append('Hello');
  streamable.append(' ');
  streamable.append('World');
  streamable.done();

  return streamable.value;
}
```

```tsx filename="app/page.tsx" highlight="12"
import { readStreamableValue } from '@ai-sdk/rsc';

export default function Page() {
  const [generation, setGeneration] = useState('');

  return (
    <div>
      <button
        onClick={async () => {
          const stream = await generate();

          for await (const value of readStreamableValue(stream)) {
            setGeneration(value);
          }
        }}
      >
        Generate
      </button>
    </div>
  );
}
```

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: 'stream',
      type: 'StreamableValue',
      description: 'The streamable value to read from.',
    },
  ]}
/>

### Returns

It returns an async iterator that contains the values emitted by the streamable value.
