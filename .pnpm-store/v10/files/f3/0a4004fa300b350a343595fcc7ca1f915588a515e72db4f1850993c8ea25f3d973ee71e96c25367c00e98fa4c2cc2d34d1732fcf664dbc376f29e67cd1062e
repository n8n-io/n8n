---
title: Streaming Status Shows But No Text Appears
description: Why useChat shows "streaming" status without any visible content
---

# Streaming Status Shows But No Text Appears

## Issue

When using `useChat`, the status changes to "streaming" immediately, but no text appears for several seconds.

## Background

The status changes to "streaming" as soon as the connection to the server is established and streaming begins - this includes metadata streaming, not just the LLM's generated tokens.

## Solution

Create a custom loading state that checks if the last assistant message actually contains content:

```tsx
'use client';

import { useChat } from '@ai-sdk/react';

export default function Page() {
  const { messages, status } = useChat();

  const lastMessage = messages.at(-1);

  const showLoader =
    status === 'streaming' &&
    lastMessage?.role === 'assistant' &&
    lastMessage?.parts?.length === 0;

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      {showLoader && <div>Loading...</div>}
    </>
  );
}
```

You can also check for specific part types if you're waiting for something specific:

```tsx
const showLoader =
  status === 'streaming' &&
  lastMessage?.role === 'assistant' &&
  !lastMessage?.parts?.some(part => part.type === 'text');
```

## Related Issues

- [GitHub Issue #7586](https://github.com/vercel/ai/issues/7586)
