---
title: Error Handling
description: Learn how to handle errors in the AI SDK UI
---

# Error Handling and warnings

## Warnings

The AI SDK shows warnings when something might not work as expected.
These warnings help you fix problems before they cause errors.

### When Warnings Appear

Warnings are shown in the browser console when:

- **Unsupported features**: You use a feature or setting that is not supported by the AI model (e.g., certain options or parameters).
- **Compatibility warnings**: A feature is used in a compatibility mode, which might work differently or less optimally than intended.
- **Other warnings**: The AI model reports another type of issue, such as general problems or advisory messages.

### Warning Messages

All warnings start with "AI SDK Warning:" so you can easily find them. For example:

```
AI SDK Warning: The feature "temperature" is not supported by this model
```

### Turning Off Warnings

By default, warnings are shown in the console. You can control this behavior:

#### Turn Off All Warnings

Set a global variable to turn off warnings completely:

```ts
globalThis.AI_SDK_LOG_WARNINGS = false;
```

#### Custom Warning Handler

You can also provide your own function to handle warnings.
It receives provider id, model id, and a list of warnings.

```ts
globalThis.AI_SDK_LOG_WARNINGS = ({ warnings, provider, model }) => {
  // Handle warnings your own way
};
```

## Error Handling

### Error Helper Object

Each AI SDK UI hook also returns an [error](/docs/reference/ai-sdk-ui/use-chat#error) object that you can use to render the error in your UI.
You can use the error object to show an error message, disable the submit button, or show a retry button.

<Note>
  We recommend showing a generic error message to the user, such as "Something
  went wrong." This is a good practice to avoid leaking information from the
  server.
</Note>

```tsx file="app/page.tsx" highlight="7,18-25,31"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, error, regenerate } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}:{' '}
          {m.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('')}
        </div>
      ))}

      {error && (
        <>
          <div>An error occurred.</div>
          <button type="button" onClick={() => regenerate()}>
            Retry
          </button>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={error != null}
        />
      </form>
    </div>
  );
}
```

#### Alternative: replace last message

Alternatively you can write a custom submit handler that replaces the last message when an error is present.

```tsx file="app/page.tsx" highlight="17-23,35"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { sendMessage, error, messages, setMessages } = useChat();

  function customSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (error != null) {
      setMessages(messages.slice(0, -1)); // remove last message
    }

    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}:{' '}
          {m.parts
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join('')}
        </div>
      ))}

      {error && <div>An error occurred.</div>}

      <form onSubmit={customSubmit}>
        <input value={input} onChange={e => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

### Error Handling Callback

Errors can be processed by passing an [`onError`](/docs/reference/ai-sdk-ui/use-chat#on-error) callback function as an option to the [`useChat`](/docs/reference/ai-sdk-ui/use-chat) or [`useCompletion`](/docs/reference/ai-sdk-ui/use-completion) hooks.
The callback function receives an error object as an argument.

```tsx file="app/page.tsx" highlight="6-9"
import { useChat } from '@ai-sdk/react';

export default function Page() {
  const {
    /* ... */
  } = useChat({
    // handle error:
    onError: error => {
      console.error(error);
    },
  });
}
```

### Injecting Errors for Testing

You might want to create errors for testing.
You can easily do so by throwing an error in your route handler:

```ts file="app/api/chat/route.ts"
export async function POST(req: Request) {
  throw new Error('This is a test error');
}
```
