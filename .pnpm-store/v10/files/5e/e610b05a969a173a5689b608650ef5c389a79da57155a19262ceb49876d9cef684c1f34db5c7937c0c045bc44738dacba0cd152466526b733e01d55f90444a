# AI SDK - OpenAI Compatible Provider

This package provides a foundation for implementing providers that expose an OpenAI-compatible API.

The primary [OpenAI provider](../openai/README.md) is more feature-rich, including OpenAI-specific experimental and legacy features. This package offers a lighter-weight alternative focused on core OpenAI-compatible functionality.

## Setup

The provider is available in the `@ai-sdk/openai-compatible` module. You can install it with

```bash
npm i @ai-sdk/openai-compatible
```

## Skill for Coding Agents

If you use coding agents such as Claude Code or Cursor, we highly recommend adding the AI SDK skill to your repository:

```shell
npx skills add vercel/ai
```

## Provider Instance

You can import the provider creation method `createOpenAICompatible` from `@ai-sdk/openai-compatible`:

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
```

## Example

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const { text } = await generateText({
  model: createOpenAICompatible({
    baseURL: 'https://api.example.com/v1',
    name: 'example',
    apiKey: process.env.MY_API_KEY,
  }).chatModel('meta-llama/Llama-3-70b-chat-hf'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Customizing headers

You can further customize headers if desired. For example, here is an alternate implementation to pass along api key authentication:

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const { text } = await generateText({
  model: createOpenAICompatible({
    baseURL: 'https://api.example.com/v1',
    name: 'example',
    headers: {
      Authorization: `Bearer ${process.env.MY_API_KEY}`,
    },
  }).chatModel('meta-llama/Llama-3-70b-chat-hf'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Including model ids for auto-completion

```ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

type ExampleChatModelIds =
  | 'meta-llama/Llama-3-70b-chat-hf'
  | 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
  | (string & {});

type ExampleCompletionModelIds =
  | 'codellama/CodeLlama-34b-Instruct-hf'
  | 'Qwen/Qwen2.5-Coder-32B-Instruct'
  | (string & {});

type ExampleEmbeddingModelIds =
  | 'BAAI/bge-large-en-v1.5'
  | 'bert-base-uncased'
  | (string & {});

const model = createOpenAICompatible<
  ExampleChatModelIds,
  ExampleCompletionModelIds,
  ExampleEmbeddingModelIds
>({
  baseURL: 'https://api.example.com/v1',
  name: 'example',
  apiKey: process.env.MY_API_KEY,
});

// Subsequent calls to e.g. `model.chatModel` will auto-complete the model id
// from the list of `ExampleChatModelIds` while still allowing free-form
// strings as well.

const { text } = await generateText({
  model: model.chatModel('meta-llama/Llama-3-70b-chat-hf'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

For more examples, see the [OpenAI Compatible Providers](https://ai-sdk.dev/providers/openai-compatible-providers) documentation.
