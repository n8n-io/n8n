---
title: AI_NoVideoGeneratedError
description: Learn how to fix AI_NoVideoGeneratedError
---

# AI_NoVideoGeneratedError

This error occurs when the AI provider fails to generate a video.
It can arise due to the following reasons:

- The model failed to generate a response.
- The model generated an invalid response.

## Properties

- `message`: The error message (optional, defaults to `'No video generated.'`).
- `responses`: Metadata about the video model responses, including timestamp, model, and headers (optional).
- `cause`: The cause of the error. You can use this for more detailed error handling (optional).

## Checking for this Error

You can check if an error is an instance of `AI_NoVideoGeneratedError` using:

```typescript
import {
  experimental_generateVideo as generateVideo,
  NoVideoGeneratedError,
} from 'ai';

try {
  await generateVideo({ model, prompt });
} catch (error) {
  if (NoVideoGeneratedError.isInstance(error)) {
    console.log('NoVideoGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Responses:', error.responses);
  }
}
```
