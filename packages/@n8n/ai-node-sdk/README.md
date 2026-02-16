# @n8n/ai-node-sdk

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

## Running Examples

The package includes example nodes demonstrating both simple and advanced patterns:

```bash
# Build examples
pnpm build:examples

# Add to your .env file
N8N_CUSTOM_EXTENSIONS="<PATH_TO_N8N>/packages/@n8n/ai-node-sdk/dist_examples/examples/nodes"

# Start n8n
pnpm start
```

You can then add "OpenAI Simple" or "OpenAI Custom" nodes to your workflows.

## Chat Model Nodes

The SDK provides `createChatModelNode` to build chat model nodes with minimal boilerplate.

### Simple Pattern: Config Object

For providers with straightforward configurations, pass an inline config object:

```typescript
import { createChatModelNode } from '@n8n/ai-node-sdk';
import { NodeConnectionTypes, type ISupplyDataFunctions } from 'n8n-workflow';

export const LmChatMyProvider = createChatModelNode({
  description: {
    displayName: 'MyProvider Chat Model',
    name: 'lmChatMyProvider',
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
  },
  
  getModel: async (context: ISupplyDataFunctions, itemIndex: number) => {
    const credentials = await context.getCredentials('myProviderApi');
    const model = context.getNodeParameter('model', itemIndex) as string;
    const temperature = context.getNodeParameter('temperature', itemIndex) as number;
    
    // Return config for OpenAI-compatible providers
    return {
      type: 'openai',
      baseUrl: credentials.url as string,
      apiKey: credentials.apiKey as string,
      model,
      temperature,
    };
  },
});
```

### Advanced Pattern: Custom Model Class

For providers with custom APIs, extend `BaseChatModel`:

```typescript
import { 
  createChatModelNode,
  BaseChatModel,
  type Message,
  type GenerateResult,
  type StreamChunk,
  type ChatModelConfig,
} from '@n8n/ai-node-sdk';
import { NodeConnectionTypes, type IHttpRequestMethods, type ISupplyDataFunctions } from 'n8n-workflow';
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
      id: body.id,
      finishReason: 'stop',
      message: {
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
export const LmChatMyProvider = createChatModelNode({
  description: {
    displayName: 'MyProvider Chat Model',
    name: 'lmChatMyProvider',
    outputs: [NodeConnectionTypes.AiLanguageModel],
    credentials: [{ name: 'myProviderApi', required: true }],
    properties: [
      { displayName: 'Model', name: 'model', type: 'string', default: 'my-model' },
      { displayName: 'Temperature', name: 'temperature', type: 'number', default: 0.7 },
    ],
  },
  
  getModel: async (context: ISupplyDataFunctions, itemIndex: number) => {
    const model = context.getNodeParameter('model', itemIndex) as string;
    const temperature = context.getNodeParameter('temperature', itemIndex) as number;
    
    return new MyProviderChatModel(
      model,
      {
        httpRequest: async (method, url, body, headers) => {
          const response = await context.helpers.httpRequestWithAuthentication.call(
            context,
            'myProviderApi',
            { method, url, body, headers },
          );
          return { body: response };
        },
        openStream: async (method, url, body, headers) => {
          const response = await context.helpers.httpRequestWithAuthentication.call(
            context,
            'myProviderApi',
            { method, url, body, headers, encoding: 'stream' },
          );
          return { body: Readable.toWeb(response) as ReadableStream<Uint8Array> };
        },
      },
      { temperature },
    );
  },
});
```

## Memory Nodes

The SDK provides abstractions for building conversation memory nodes with custom storage backends.

### Simple Pattern: Custom Storage

Extend `BaseChatHistory` to implement storage, then use `WindowedChatMemory`:

```typescript
import {
  createChatMemoryNode,
  BaseChatHistory,
  WindowedChatMemory,
  type Message,
} from '@n8n/ai-node-sdk';
import { NodeConnectionTypes, type ISupplyDataFunctions } from 'n8n-workflow';

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
export const MemoryMyDb = createChatMemoryNode({
  description: {
    displayName: 'MyDB Memory',
    name: 'memoryMyDb',
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
  },

  async getMemory(context: ISupplyDataFunctions, itemIndex: number) {
    const credentials = await context.getCredentials('myDbApi');
    const sessionId = context.getNodeParameter('sessionId', itemIndex) as string;
    const windowSize = context.getNodeParameter('windowSize', itemIndex) as number;

    const history = new MyDbChatHistory(
      sessionId,
      credentials.apiKey as string,
      context.helpers.httpRequest,
    );
    
    const memory = new WindowedChatMemory(history, { windowSize });
    
    return memory;
  }
});
```