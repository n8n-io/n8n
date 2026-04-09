# AI SDK - OpenAI Provider

The **[OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai)** for the [AI SDK](https://ai-sdk.dev/docs)
contains language model support for the OpenAI chat and completion APIs and embedding model support for the OpenAI embeddings API.

## Setup

The OpenAI provider is available in the `@ai-sdk/openai` module. You can install it with

```bash
npm i @ai-sdk/openai
```

## Skill for Coding Agents

If you use coding agents such as Claude Code or Cursor, we highly recommend adding the AI SDK skill to your repository:

```shell
npx skills add vercel/ai
```

## Provider Instance

You can import the default provider instance `openai` from `@ai-sdk/openai`:

```ts
import { openai } from '@ai-sdk/openai';
```

## Example

```ts
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-5-mini'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Documentation

Please check out the **[OpenAI provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/openai)** for more information.
