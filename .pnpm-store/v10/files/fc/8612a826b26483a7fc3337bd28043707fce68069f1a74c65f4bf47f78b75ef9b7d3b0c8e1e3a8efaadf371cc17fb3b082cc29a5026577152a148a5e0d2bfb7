---
title: AI_InvalidPromptError
description: Learn how to fix AI_InvalidPromptError
---

# AI_InvalidPromptError

This error occurs when the prompt provided is invalid.

## Potential Causes

### UI Messages

You are passing a `UIMessage[]` as messages into e.g. `streamText`.

You need to first convert them to a `ModelMessage[]` using `convertToModelMessages()`.

```typescript
import { type UIMessage, generateText, convertToModelMessages } from 'ai';

const messages: UIMessage[] = [
  /* ... */
];

const result = await generateText({
  // ...
  messages: await convertToModelMessages(messages),
});
```

## Properties

- `prompt`: The invalid prompt value
- `message`: The error message (required in constructor)
- `cause`: The cause of the error (optional)

## Checking for this Error

You can check if an error is an instance of `AI_InvalidPromptError` using:

```typescript
import { InvalidPromptError } from 'ai';

if (InvalidPromptError.isInstance(error)) {
  // Handle the error
}
```
