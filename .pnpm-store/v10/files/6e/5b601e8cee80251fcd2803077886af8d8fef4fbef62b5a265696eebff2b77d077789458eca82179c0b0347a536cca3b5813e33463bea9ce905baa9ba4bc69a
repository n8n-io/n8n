# AI SDK - xAI Grok Provider

The **[xAI Grok provider](https://ai-sdk.dev/providers/ai-sdk-providers/xai)** for the [AI SDK](https://ai-sdk.dev/docs)
contains language model support for the xAI chat and completion APIs.

## Setup

The xAI Grok provider is available in the `@ai-sdk/xai` module. You can install it with

```bash
npm i @ai-sdk/xai
```

## Skill for Coding Agents

If you use coding agents such as Claude Code or Cursor, we highly recommend adding the AI SDK skill to your repository:

```shell
npx skills add vercel/ai
```

## Provider Instance

You can import the default provider instance `xai` from `@ai-sdk/xai`:

```ts
import { xai } from '@ai-sdk/xai';
```

## Example

```ts
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: xai('grok-3'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

## Documentation

Please check out the **[xAI Grok provider documentation](https://ai-sdk.dev/providers/ai-sdk-providers/xai)** for more information.
