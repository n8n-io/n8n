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

## Running examples

```bash
pnpm build:examples
```

Update your env file with:

```bash
N8N_CUSTOM_EXTENSIONS="<PATH_TO_N8N>/packages/@n8n/ai-utilities/dist_examples/examples/nodes"
```

Start n8n and add "OpenAI Simple" or "OpenAI Custom" to workflows

# Chat model SDK

## Core Pattern

### Option A: OpenAI-Compatible APIs (easiest)

Pass config directly to `supplyModel` for providers that follow the OpenAI API format:

```typescript
import { supplyModel } from '@n8n/ai-utilities';

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
import { BaseChatModel, supplyModel, type Message, type GenerateResult, type StreamChunk } from '@n8n/ai-utilities';

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
import { supplyModel } from '@n8n/ai-utilities';

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
} from '@n8n/ai-utilities';
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
      speaker: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'bot' : m.role,
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

# Memory SDK

The Memory SDK provides abstractions for building conversation memory nodes without LangChain dependencies.

## Architecture

Memory uses a **two-layer design**:

1. **ChatHistory** (Storage Layer) - Where messages are stored (your custom implementation)
2. **ChatMemory** (Logic Layer) - How messages are managed (windowing, session scoping)

### Naming Convention

The SDK uses n8n-specific naming to avoid confusion with LangChain classes:

| n8n SDK | LangChain Equivalent |
|---------|---------------------|
| `ChatHistory` (interface) | `BaseChatMessageHistory` |
| `BaseChatHistory` (base class) | `BaseChatMessageHistory` |
| `ChatMemory` (interface) | `BaseChatMemory` |
| `BaseChatMemory` (base class) | `BaseChatMemory` |
| `WindowedChatMemory` | `BufferWindowMemory` |

## Core Pattern

### Option A: Custom Storage

For exotic databases not covered by the SDK, extend `BaseChatHistory`:

```typescript
import {
  BaseChatHistory,
  WindowedChatMemory,
  supplyMemory,
  type Message,
} from '@n8n/ai-utilities';

class MyChatHistory extends BaseChatHistory {
  constructor(private sessionId: string) {
    super();
  }

  async getMessages(): Promise<Message[]> {
    // Read from your storage...
    return [];
  }

  async addMessage(message: Message): Promise<void> {
    // Write to your storage...
  }

  async clear(): Promise<void> {
    // Clear your storage...
  }
}

const history = new MyChatHistory(sessionId);
const memory = new WindowedChatMemory(history, { windowSize: 10 });
return supplyMemory(this, memory);
```

### Option B: Custom Memory Logic

For custom memory behavior (not just storage), extend `BaseChatMemory`:

```typescript
import {
  BaseChatMemory,
  supplyMemory,
  type Message,
  type ChatHistory,
  type ChatMemory,
} from '@n8n/ai-utilities';

class MyCustomChatMemory extends BaseChatMemory {
  readonly chatHistory: ChatHistory;

  constructor(chatHistory: ChatHistory) {
    super();
    this.chatHistory = chatHistory;
  }

  async loadMessages(): Promise<Message[]> {
    const messages = await this.chatHistory.getMessages();
    // Apply your custom logic here...
    return messages;
  }

  async saveTurn(input: string, output: string): Promise<void> {
    await this.chatHistory.addMessages([
      { role: 'user', content: [{ type: 'text', text: input }] },
      { role: 'assistant', content: [{ type: 'text', text: output }] },
    ]);
  }

  async clear(): Promise<void> {
    await this.chatHistory.clear();
  }
}

const history = new MyChatHistory(sessionId);
const memory = new MyCustomChatMemory(history);
return supplyMemory(this, memory);
```

---

## Community Node Examples

### ImaginaryDB Memory Node

```typescript
import {
  BaseChatHistory,
  WindowedChatMemory,
  supplyMemory,
  type Message,
} from '@n8n/ai-utilities';
import { 
  NodeConnectionTypes, 
  type INodeType, 
  type ISupplyDataFunctions, 
  type SupplyData,
  type IHttpRequestMethods,
} from 'n8n-workflow';

// Custom storage implementation using n8n's HTTP helpers
class ImaginaryDbChatHistory extends BaseChatHistory {
  constructor(
    private sessionId: string,
    private baseUrl: string,
    private apiKey: string,
    private httpRequest: ISupplyDataFunctions['helpers']['httpRequest'],
  ) {
    super();
  }

  async getMessages(): Promise<Message[]> {
    const data = await this.httpRequest({
      method: 'GET',
      url: `${this.baseUrl}/sessions/${this.sessionId}/messages`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      json: true,
    });

    // Convert from provider format to n8n Message format
    return data.messages.map((m: any) => ({
      role: m.speaker === 'user' ? 'user' : m.speaker === 'bot' ? 'assistant' : m.speaker,
      content: [{ type: 'text', text: m.text }],
    }));
  }

  async addMessage(message: Message): Promise<void> {
    const text = message.content.find((c) => c.type === 'text')?.text ?? '';
    await this.httpRequest({
      method: 'POST',
      url: `${this.baseUrl}/sessions/${this.sessionId}/messages`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: {
        speaker: message.role === 'user' ? 'user' : message.role === 'assistant' ? 'bot' : message.role,
        text,
      },
      json: true,
    });
  }

  async clear(): Promise<void> {
    await this.httpRequest({
      method: 'DELETE',
      url: `${this.baseUrl}/sessions/${this.sessionId}`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}

// The n8n node
export class MemoryImaginaryDb implements INodeType {
  description = {
    displayName: 'ImaginaryDB Memory',
    name: 'memoryImaginaryDb',
    icon: 'file:imaginarydb.svg',
    group: ['transform'],
    version: 1,
    description: 'Use ImaginaryDB for chat memory storage',
    defaults: { name: 'ImaginaryDB Memory' },
    codex: { categories: ['assistant'], subcategories: { AI: ['Memory'] } },
    inputs: [],
    outputs: [NodeConnectionTypes.AiMemory],
    outputNames: ['Memory'],
    credentials: [{ name: 'imaginaryDbApi', required: true }],
    properties: [
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '={{ $json.sessionId }}',
        description: 'Unique identifier for the conversation session',
      },
      {
        displayName: 'Window Size',
        name: 'windowSize',
        type: 'number',
        default: 10,
        description: 'Number of recent message pairs to keep in context',
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials<{ apiKey: string; baseUrl: string }>('imaginaryDbApi');
    const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
    const windowSize = this.getNodeParameter('windowSize', itemIndex) as number;

    // Pass n8n's HTTP request helper directly
    const history = new ImaginaryDbChatHistory(
      sessionId,
      credentials.baseUrl,
      credentials.apiKey,
      this.helpers.httpRequest,
    );
    const memory = new WindowedChatMemory(history, { windowSize });

    return supplyMemory(this, memory);
  }
}
```

> **Note:** Community nodes must use `this.helpers.httpRequest` or `this.helpers.httpRequestWithAuthentication`
> for HTTP calls. Direct `fetch` or other global APIs are not allowed.


---

## Summary

| Before (LangChain) | After (SDK) |
|--------------------|-------------|
| `import { ChatOpenAI } from '@langchain/openai'` | `import { supplyModel } from '@n8n/ai-utilities'` |
| `new ChatOpenAI({ ... })` | `supplyModel(this, { type: 'openai', ... })` |
| Custom model provider | `class MyModel extends BaseChatModel { ... }` |
| `return { response: model }` | `return supplyModel(this, model)` |
| `import { BufferWindowMemory } from '@langchain/classic/memory'` | `import { WindowedChatMemory } from '@n8n/ai-utilities'` |
| Custom storage backend | `class MyHistory extends BaseChatHistory { ... }` |
| `return { response: logWrapper(memory, this) }` | `return supplyMemory(this, memory)` |
| LangChain message types | `Message` with roles: `system`, `human`, `ai`, `tool` |
| `tool_calls[].args` | `toolCalls[].arguments` |
