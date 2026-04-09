---
title: Custom headers, body, and credentials not working with useChat
description: Troubleshooting errors related to custom request configuration in useChat hook
---

# Custom headers, body, and credentials not working with useChat

## Issue

When using the `useChat` hook, custom request options like headers, body fields, and credentials configured directly on the hook are not being sent with the request:

```tsx
// These options are not sent with the request
const { messages, sendMessage } = useChat({
  headers: {
    Authorization: 'Bearer token123',
  },
  body: {
    user_id: '123',
  },
  credentials: 'include',
});
```

## Background

The `useChat` hook has changed its API for configuring request options. Direct options like `headers`, `body`, and `credentials` on the hook itself are no longer supported. Instead, you need to use the `transport` configuration with `DefaultChatTransport` or pass options at the request level.

## Solution

There are three ways to properly configure request options with `useChat`:

### Option 1: Request-Level Configuration (Recommended for Dynamic Values)

For dynamic values that change over time, the recommended approach is to pass options when calling `sendMessage`:

```tsx
const { messages, sendMessage } = useChat();

// Send options with each message
sendMessage(
  { text: input },
  {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`, // Dynamic auth token
      'X-Request-ID': generateRequestId(),
    },
    body: {
      temperature: 0.7,
      max_tokens: 100,
      user_id: getCurrentUserId(), // Dynamic user ID
      sessionId: getCurrentSessionId(), // Dynamic session
    },
  },
);
```

This approach ensures that the most up-to-date values are always sent with each request.

### Option 2: Hook-Level Configuration with Static Values

For static values that don't change during the component lifecycle, use the `DefaultChatTransport`:

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    headers: {
      'X-API-Version': 'v1', // Static API version
      'X-App-ID': 'my-app', // Static app identifier
    },
    body: {
      model: 'gpt-5.1', // Default model
      stream: true, // Static configuration
    },
    credentials: 'include', // Static credentials policy
  }),
});
```

### Option 3: Hook-Level Configuration with Resolvable Functions

If you need dynamic values at the hook level, you can use functions that return configuration values. However, request-level configuration is generally preferred for better reliability:

```tsx
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    headers: () => ({
      Authorization: `Bearer ${getAuthToken()}`,
      'X-User-ID': getCurrentUserId(),
    }),
    body: () => ({
      sessionId: getCurrentSessionId(),
      preferences: getUserPreferences(),
    }),
    credentials: () => (isAuthenticated() ? 'include' : 'same-origin'),
  }),
});
```

<Note>
  For component state that changes over time, request-level configuration
  (Option 1) is recommended. If using hook-level functions, consider using
  `useRef` to store current values and reference `ref.current` in your
  configuration function.
</Note>

### Combining Hook and Request Level Options

Request-level options take precedence over hook-level options:

```tsx
// Hook-level default configuration
const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    headers: {
      'X-API-Version': 'v1',
    },
    body: {
      model: 'gpt-5.1',
    },
  }),
});

// Override or add options per request
sendMessage(
  { text: input },
  {
    headers: {
      'X-API-Version': 'v2', // This overrides the hook-level header
      'X-Request-ID': '123', // This is added
    },
    body: {
      model: 'gpt-5-mini', // This overrides the hook-level body field
      temperature: 0.5, // This is added
    },
  },
);
```

For more details on request configuration, see the [Request Configuration](/docs/ai-sdk-ui/chatbot#request-configuration) documentation.
