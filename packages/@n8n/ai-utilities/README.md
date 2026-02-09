# @n8n/ai-utilities

Utilities for building AI nodes in n8n.

## Installation

This package is part of the n8n monorepo and should be installed via the workspace.

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev
```

# AI Node SDK Interface Specification

## Core Pattern

### Option A: OpenAI-Compatible APIs (easiest)

Pass config directly to `supplyModel` for providers that follow the OpenAI API format:

```typescript
import { supplyModel } from '@n8n/ai-node-sdk';

return supplyModel(this, {
  type: 'openai',
  modelId: 'model-name',
  apiKey: 'your-api-key',
  baseURL: 'https://api.provider.com/v1',  // OpenRouter, DeepSeek, etc.
});
```

### Option B: Custom API (full control)

Extend `BaseChatModel` and implement `generate()` + `stream()`:

```typescript
import { BaseChatModel, supplyModel, type Message, type GenerateResult, type StreamChunk } from '@n8n/ai-node-sdk';

class MyChatModel extends BaseChatModel {
  async generate(messages: Message[]): Promise<GenerateResult> {
    // Call your API, convert messages to provider format...
    return { text: '...', toolCalls: [...] };
  }

  async *stream(messages: Message[]): AsyncIterable<StreamChunk> {
    // Stream from your API...
    yield { type: 'text-delta', textDelta: '...' };
    yield { type: 'finish', finishReason: 'stop' };
  }
}

const model = new MyChatModel('my-provider', 'model-id', { apiKey: '...' });
return supplyModel(this, model);
```

---

## Before/After Examples

### Example 1: LmChatOpenRouter

**Before (LangChain):**

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { N8nLlmTracing } from '../N8nLlmTracing';

async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
  const credentials = await this.getCredentials<OpenAICompatibleCredential>('openRouterApi');
  const modelName = this.getNodeParameter('model', itemIndex) as string;
  const options = this.getNodeParameter('options', itemIndex, {}) as { ... };

  const model = new ChatOpenAI({
    apiKey: credentials.apiKey,
    model: modelName,
    ...options,
    configuration: { baseURL: credentials.url, ... },
    callbacks: [new N8nLlmTracing(this)],
    onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, openAiFailedAttemptHandler),
  });

  return { response: model };
}
```

**After (SDK):**

```typescript
import { supplyModel } from '@n8n/ai-node-sdk';

async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
  const credentials = await this.getCredentials<{ url: string; apiKey: string }>('openRouterApi');
  const modelName = this.getNodeParameter('model', itemIndex) as string;
  const options = this.getNodeParameter('options', itemIndex, {}) as { temperature?: number };

  return supplyModel(this, {
    type: 'openai',
    modelId: modelName,
    apiKey: credentials.apiKey,
    baseURL: credentials.url,
    ...options,
  });
}
```

> **Note:** `type: 'openai'` uses the SDK's built-in OpenAI-compatible implementation.
> Works with OpenRouter, DeepSeek, Azure OpenAI, and any provider following the OpenAI API format.

---

## Community Node Examples

### ImaginaryLLM Chat Model

```typescript
import {
  BaseChatModel,
  supplyModel,
  type Message,
  type GenerateResult,
  type StreamChunk,
  type ChatModelConfig,
} from '@n8n/ai-node-sdk';
import { NodeConnectionTypes, type INodeType, type ISupplyDataFunctions, type SupplyData } from 'n8n-workflow';

// Custom chat model extending BaseChatModel
class ImaginaryLlmChatModel extends BaseChatModel {
  constructor(
    private apiKey: string,
    modelId: string,
    config?: ChatModelConfig,
  ) {
    super('imaginary-llm', modelId, config);
  }

  async generate(messages: Message[], config?: ChatModelConfig): Promise<GenerateResult> {
    // Convert n8n messages to provider format
    const providerMessages = messages.map(m => ({
      speaker: m.role === 'human' ? 'user' : m.role === 'ai' ? 'bot' : m.role,
      text: m.content.find(c => c.type === 'text')?.text ?? '',
    }));

    // Call the API
    const response = await fetch('https://api.imaginary-llm.example.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelId,
        conversation: providerMessages,
        settings: {
          creativity: config?.temperature ?? 0.7,
          max_length: config?.maxTokens,
        },
      }),
    });

    const data = await response.json();

    return {
      text: data.reply.text,
      toolCalls: data.reply.actions?.map((a: any) => ({
        id: a.id,
        name: a.name,
        arguments: a.params,
      })),
      usage: data.metrics ? {
        promptTokens: data.metrics.input_tokens,
        completionTokens: data.metrics.output_tokens,
        totalTokens: data.metrics.input_tokens + data.metrics.output_tokens,
      } : undefined,
    };
  }

  async *stream(messages: Message[], config?: ChatModelConfig): AsyncIterable<StreamChunk> {
    // Streaming implementation...
    yield { type: 'text-delta', textDelta: '...' };
    yield { type: 'finish', finishReason: 'stop' };
  }
}

// The n8n node
export class LmChatImaginaryLlm implements INodeType {
  description = {
    displayName: 'ImaginaryLLM Chat Model',
    name: 'lmChatImaginaryLlm',
    outputs: [NodeConnectionTypes.AiLanguageModel],
    credentials: [{ name: 'imaginaryLlmApi', required: true }],
    properties: [
      { displayName: 'Model', name: 'model', type: 'options', options: [
        { name: 'Imaginary Pro', value: 'imaginary-pro' },
        { name: 'Imaginary Fast', value: 'imaginary-fast' },
      ], default: 'imaginary-pro' },
      { displayName: 'Temperature', name: 'temperature', type: 'number', default: 0.7 },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials<{ apiKey: string }>('imaginaryLlmApi');
    const modelName = this.getNodeParameter('model', itemIndex) as string;
    const temperature = this.getNodeParameter('temperature', itemIndex) as number;

    const model = new ImaginaryLlmChatModel(credentials.apiKey, modelName, { temperature });

    return supplyModel(this, model);
  }
}
```

---

## Summary

| Before (LangChain) | After (SDK) |
|--------------------|-------------|
| `import { ChatOpenAI } from '@langchain/openai'` | `import { supplyModel } from '@n8n/ai-node-sdk'` |
| `new ChatOpenAI({ ... })` | `supplyModel(this, { type: 'openai', ... })` |
| Custom provider | `class MyModel extends BaseChatModel { ... }` |
| `return { response: model }` | `return supplyModel(this, model)` |
| `return { response: logWrapper(memory, this) }` | `return supplyMemory(this, memory)` |
| LangChain message types | `Message` with roles: `system`, `human`, `ai`, `tool` |
| `tool_calls[].args` | `toolCalls[].arguments` |
