---
title: React error "Maximum update depth exceeded"
description: Troubleshooting errors related to the "Maximum update depth exceeded" error.
---

# React error "Maximum update depth exceeded"

## Issue

I am using the AI SDK in a React project with the `useChat` or `useCompletion` hooks
and I get the following error when AI responses stream in: `Maximum update depth exceeded`.

## Background

By default, the UI is re-rendered on every chunk that arrives.
This can overload the rendering, especially on slower devices or when complex components
need updating (e.g. Markdown). Throttling can mitigate this.

## Solution

Use the `experimental_throttle` option to throttle the UI updates:

### `useChat`

```tsx filename="page.tsx" highlight="2-3"
const { messages, ... } = useChat({
  // Throttle the messages and data updates to 50ms:
  experimental_throttle: 50
})
```

### `useCompletion`

```tsx filename="page.tsx" highlight="2-3"
const { completion, ... } = useCompletion({
  // Throttle the completion and data updates to 50ms:
  experimental_throttle: 50
})
```
