---
title: useChat "An error occurred"
description: Troubleshooting errors related to the "An error occurred" error in useChat.
---

# `useChat` "An error occurred"

## Issue

I am using [`useChat`](/docs/reference/ai-sdk-ui/use-chat) and I get the error "An error occurred".

## Background

Error messages from `streamText` are masked by default when using `toDataStreamResponse` for security reasons (secure-by-default).
This prevents leaking sensitive information to the client.

## Solution

To forward error details to the client or to log errors, use the `getErrorMessage` function when calling `toDataStreamResponse`.

```tsx
export function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}
```

```tsx
const result = streamText({
  // ...
});

return result.toUIMessageStreamResponse({
  getErrorMessage: errorHandler,
});
```

In case you are using `createDataStreamResponse`, you can use the `onError` function when calling `toDataStreamResponse`:

```tsx
const response = createDataStreamResponse({
  // ...
  async execute(dataStream) {
    // ...
  },
  onError: errorHandler,
});
```
