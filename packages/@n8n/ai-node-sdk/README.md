# @n8n/ai-node-sdk

> **Preview:** This package is in preview. The API may change without notice. AI nodes are not yet accepted for verification.

Public SDK for building AI nodes in n8n. This package provides a simplified API for creating chat model and memory nodes without LangChain dependencies.

## Installation in node packages

Include the package in your node packages by updating `peerDependencies`:

```json
{
  "peerDependencies": {
    "n8n-workflow": "*",
    "@n8n/ai-node-sdk": "*"
  }
}
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run in watch mode
pnpm dev
```

## Chat Model Nodes

Chat model nodes implement the `INodeType` interface and use `supplyModel` to provide model instances.

### Simple Pattern: OpenAI-Compatible Providers

For OpenAI-compatible providers, use the config object pattern with `supplyModel`:

```typescript
import { supplyModel } from '@n8n/ai-node-sdk';
import {
  type INodeType,
  type INodeTypeDescription,
  NodeConnectionTypes,
  type SupplyData,
  type ISupplyDataFunctions,
} from 'n8n-workflow';

export class LmChatMyProvider implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MyProvider Chat Model',
    name: 'lmChatMyProvider',
    icon: 'fa:robot',
    group: ['transform'],
    version: [1],
    description: 'For advanced usage with an AI chain',
    defaults: {
      name: 'MyProvider Chat Model',
    },
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    credentials: [{ name: 'myProviderApi', required: true }],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        default: 'my-model',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.7,
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials('myProviderApi');
    const model = this.getNodeParameter('model', itemIndex) as string;
    const temperature = this.getNodeParameter('temperature', itemIndex) as number;

    // Return config for OpenAI-compatible providers
    return supplyModel(this, {
      type: 'openai',
      baseUrl: credentials.url as string,
      apiKey: credentials.apiKey as string,
      model,
      temperature,
    });
  }
}
```

### Advanced Pattern: Custom Model Class

For providers with custom APIs, extend `BaseChatModel` and pass an instance to `supplyModel`:

```typescript
import {
  BaseChatModel,
  supplyModel,
  type Message,
  type GenerateResult,
  type StreamChunk,
  type ChatModelConfig,
} from '@n8n/ai-node-sdk';
import {
  type INodeType,
  type INodeTypeDescription,
  NodeConnectionTypes,
  type IHttpRequestMethods,
  type ISupplyDataFunctions,
  type SupplyData,
} from 'n8n-workflow';
import type Stream from 'node:stream';
import { Readable } from 'node:stream';

// Custom model implementation
class MyProviderChatModel extends BaseChatModel {
  constructor(
    modelId: string,
    private requests: {
      httpRequest: (
        method: IHttpRequestMethods,
        url: string,
        body?: object,
        headers?: Record<string, string>,
      ) => Promise<{ body: unknown }>;
      openStream: (
        method: IHttpRequestMethods,
        url: string,
        body?: object,
        headers?: Record<string, string>,
      ) => Promise<{ body: ReadableStream<Uint8Array> }>;
    },
    config?: ChatModelConfig,
  ) {
    super('my-provider', modelId, config);
  }

  async generate(messages: Message[], config?: ChatModelConfig): Promise<GenerateResult> {
    // Convert n8n messages to provider format
    const providerMessages = messages.map(m => ({
      role: m.role,
      content: m.content.find(c => c.type === 'text')?.text ?? '',
    }));

    // Call the provider API
    const response = await this.requests.httpRequest('POST', '/chat', {
      model: this.modelId,
      messages: providerMessages,
      temperature: config?.temperature,
    });

    const body = response.body as any;

    return {
      finishReason: 'stop',
      message: {
        id: body.id,
        role: 'assistant',
        content: [{ type: 'text', text: body.content }],
      },
      usage: {
        promptTokens: body.usage.prompt_tokens,
        completionTokens: body.usage.completion_tokens,
        totalTokens: body.usage.total_tokens,
      },
    };
  }

  async *stream(messages: Message[], config?: ChatModelConfig): AsyncIterable<StreamChunk> {
    // Implement streaming...
    yield { type: 'text-delta', delta: 'response text' };
    yield { type: 'finish', finishReason: 'stop' };
  }
}

// Node definition
export class LmChatMyProvider implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MyProvider Chat Model',
    name: 'lmChatMyProvider',
    icon: 'fa:robot',
    group: ['transform'],
    version: [1],
    description: 'For advanced usage with an AI chain',
    defaults: {
      name: 'MyProvider Chat Model',
    },
    inputs: [],
    outputs: [NodeConnectionTypes.AiLanguageModel],
    credentials: [{ name: 'myProviderApi', required: true }],
    properties: [
      { displayName: 'Model', name: 'model', type: 'string', default: 'my-model' },
      { displayName: 'Temperature', name: 'temperature', type: 'number', default: 0.7 },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const model = this.getNodeParameter('model', itemIndex) as string;
    const temperature = this.getNodeParameter('temperature', itemIndex) as number;

    const chatModel = new MyProviderChatModel(
      model,
      {
        httpRequest: async (method, url, body, headers) => {
          const response = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'myProviderApi',
            { method, url, body, headers },
          );
          return { body: response };
        },
        openStream: async (method, url, body, headers) => {
          const response = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'myProviderApi',
            { method, url, body, headers, encoding: 'stream' },
          )) as Stream.Readable;
          return { body: Readable.toWeb(response) as ReadableStream<Uint8Array> };
        },
      },
      { temperature },
    );

    return supplyModel(this, chatModel);
  }
}
```

## Memory Nodes

Memory nodes implement the `INodeType` interface and use `supplyMemory` to provide memory instances.

### Pattern: Custom Storage with Windowed Memory

Extend `BaseChatHistory` to implement storage, then wrap it with `WindowedChatMemory` and pass to `supplyMemory`:

```typescript
import {
  BaseChatHistory,
  WindowedChatMemory,
  supplyMemory,
  type Message,
} from '@n8n/ai-node-sdk';
import {
  type INodeType,
  type INodeTypeDescription,
  NodeConnectionTypes,
  type ISupplyDataFunctions,
  type SupplyData,
} from 'n8n-workflow';

// Custom storage implementation
class MyDbChatHistory extends BaseChatHistory {
  constructor(
    private sessionId: string,
    private apiKey: string,
    private httpRequest: any,
  ) {
    super();
  }

  async getMessages(): Promise<Message[]> {
    const data = await this.httpRequest({
      method: 'GET',
      url: `/sessions/${this.sessionId}/messages`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      json: true,
    });

    return data.messages.map((m: any) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content }],
    }));
  }

  async addMessage(message: Message): Promise<void> {
    const text = message.content.find(c => c.type === 'text')?.text ?? '';
    await this.httpRequest({
      method: 'POST',
      url: `/sessions/${this.sessionId}/messages`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: { role: message.role, content: text },
      json: true,
    });
  }

  async clear(): Promise<void> {
    await this.httpRequest({
      method: 'DELETE',
      url: `/sessions/${this.sessionId}`,
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}

// Memory node
export class MemoryMyDb implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MyDB Memory',
    name: 'memoryMyDb',
    icon: 'fa:database',
    group: ['transform'],
    version: [1],
    description: 'Store conversation history in MyDB',
    defaults: {
      name: 'MyDB Memory',
    },
    inputs: [],
    outputs: [NodeConnectionTypes.AiMemory],
    credentials: [{ name: 'myDbApi', required: true }],
    properties: [
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '={{ $json.sessionId }}',
      },
      {
        displayName: 'Window Size',
        name: 'windowSize',
        type: 'number',
        default: 10,
        description: 'Number of recent message pairs to keep',
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials('myDbApi');
    const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
    const windowSize = this.getNodeParameter('windowSize', itemIndex) as number;

    const history = new MyDbChatHistory(
      sessionId,
      credentials.apiKey as string,
      this.helpers.httpRequest,
    );

    const memory = new WindowedChatMemory(history, { windowSize });

    return supplyMemory(this, memory);
  }
}
```
