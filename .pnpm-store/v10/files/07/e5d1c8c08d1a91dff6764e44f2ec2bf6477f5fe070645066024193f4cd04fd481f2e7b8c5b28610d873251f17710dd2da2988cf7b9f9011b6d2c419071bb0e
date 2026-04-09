# AI SDK - Google Generative AI Provider

The **[Google Generative AI provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)** for the [AI SDK](https://ai-sdk.dev/docs) contains language model support for the [Google Generative AI](https://ai.google/discover/generativeai/) APIs.

## Setup

The Google Generative AI provider is available in the `@ai-sdk/google` module. You can install it with

```bash
npm i @ai-sdk/google
```

## Skill for Coding Agents

If you use coding agents such as Claude Code or Cursor, we highly recommend adding the AI SDK skill to your repository:

```shell
npx skills add vercel/ai
```

## Provider Instance

You can import the default provider instance `google` from `@ai-sdk/google`:

```ts
import { google } from '@ai-sdk/google';
```

## Example

```ts
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const { text } = await generateText({
  model: google('gemini-2.5-pro'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Documentation

Please check out the **[Google Generative AI provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)** for more information.
