---
title: Server Actions in Client Components
description: Troubleshooting errors related to server actions in client components.
---

# Server Actions in Client Components

You may use Server Actions in client components, but sometimes you may encounter the following issues.

## Issue

It is not allowed to define inline `"use server"` annotated Server Actions in Client Components.

## Solution

To use Server Actions in a Client Component, you can either:

- Export them from a separate file with `"use server"` at the top.
- Pass them down through props from a Server Component.
- Implement a combination of [`createAI`](/docs/reference/ai-sdk-rsc/create-ai) and [`useActions`](/docs/reference/ai-sdk-rsc/use-actions) hooks to access them.

Learn more about [Server Actions and Mutations](https://nextjs.org/docs/app/api-reference/functions/server-actions#with-client-components).

```ts file='actions.ts'
'use server';

import { generateText } from 'ai';
__PROVIDER_IMPORT__;

export async function getAnswer(question: string) {
  'use server';

  const { text } = await generateText({
    model: __MODEL__,
    prompt: question,
  });

  return { answer: text };
}
```
