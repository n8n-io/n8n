# @n8n/workflow-json-sdk

A Zod-like API for constructing n8n workflows programmatically in TypeScript.

## Installation

```bash
pnpm add @n8n/workflow-json-sdk
```

## Quick Start

```typescript
import { workflow } from '@n8n/workflow-json-sdk';

const wf = workflow({ name: 'My First Workflow' });

const trigger = wf
  .node('Manual Trigger')
  .type('n8n-nodes-base.manualTrigger')
  .parameters({});

const setNode = wf
  .node('Set Values')
  .type('n8n-nodes-base.set')
  .parameters({
    values: {
      string: [
        { name: 'message', value: 'Hello World' }
      ]
    }
  });

wf.connection().from(trigger).to(setNode).build();

const workflowJSON = wf.toJSON();
console.log(JSON.stringify(workflowJSON, null, 2));
```

## Features

- 🎯 **Type-safe** workflow construction with intelligent parameter inference
- 🔗 **Fluent API** inspired by Zod
- 🧩 **Modular** node and connection builders
- 🔄 **Bi-directional** - create from scratch or parse existing workflows
- 📦 **Zero dependencies** (except dev dependencies)
- ✅ **Fully tested**

## Type Safety

The SDK provides **full type safety** for node parameters. When you call `.type()` with a specific node type, the `.parameters()` method will automatically infer the correct parameter types for that node:

```typescript
import { workflow } from '@n8n/workflow-json-sdk';

const wf = workflow({ name: 'Type-safe workflow' });

// Before calling .type(), parameters accepts any INodeParameters
const genericNode = wf.node('Generic Node').parameters({});

// After calling .type(), parameters are type-safe for that specific node type
const httpNode = wf
  .node('HTTP Request')
  .type('n8n-nodes-base.httpRequest')
  .parameters({
    method: 'GET',              // ✅ Autocomplete and type checking
    url: 'https://api.example.com',
    authentication: 'none',
    options: {},
    // TypeScript will error if you use invalid parameters!
  });

// Type changes dynamically when you use a different node type
const slackNode = wf
  .node('Slack')
  .type('n8n-nodes-base.slack')
  .parameters({
    resource: 'message',        // ✅ Only valid Slack parameters allowed
    operation: 'create',
    // TypeScript knows about all Slack-specific options!
  });
```

This means:
- ✅ **Autocomplete** - Your IDE will suggest valid parameters
- ✅ **Type checking** - Invalid parameters are caught at compile time
- ✅ **Refactoring safety** - Parameter changes are tracked across your codebase
- ✅ **Self-documenting** - No need to look up parameter names

## API Reference

### Creating a Workflow

```typescript
import { workflow } from '@n8n/workflow-json-sdk';

// Create a new workflow
const wf = workflow({ name: 'My Workflow' });

// With metadata
const wf = workflow({
  name: 'My Workflow',
  meta: {
    instanceId: 'abc123',
    templateCredsSetupCompleted: true
  }
});
```

### Adding Nodes

```typescript
const trigger = wf
  .node('My Trigger')              // Node name (required)
  .type('n8n-nodes-base.manualTrigger')  // Node type (required)
  .parameters({})                  // Node parameters (required)
  .position(100, 200)              // [x, y] position on canvas
  .version(1.0)                    // Type version
  .disabled(false)                 // Enable/disable node
  .notes('My note', true)          // Notes and show in flow
  .webhookId('webhook-123')        // Webhook ID
  .credentials({                   // Node credentials
    api: {
      id: 'cred-123',
      name: 'My API Credential'
    }
  })
  .retryOnFail(true, 3, 1000)     // Retry: enabled, max tries, wait time
  .alwaysOutputData(true)         // Always output data
  .executeOnce(true)              // Execute once
  .continueOnFail(false);         // Continue on fail
```

### Creating Connections

#### Simple Connection

```typescript
const nodeA = wf.node('Node A').type('n8n-nodes-base.set').parameters({});
const nodeB = wf.node('Node B').type('n8n-nodes-base.set').parameters({});

wf.connection()
  .from(nodeA)
  .to(nodeB);
```

#### Connect to Multiple Nodes

```typescript
const trigger = wf.node('Trigger').type('n8n-nodes-base.manualTrigger').parameters({});
const nodeA = wf.node('Node A').type('n8n-nodes-base.set').parameters({});
const nodeB = wf.node('Node B').type('n8n-nodes-base.set').parameters({});

wf.connection()
  .from(trigger)
  .to([nodeA, nodeB]);  // Array of nodes
```

#### Chain Connections

```typescript
wf.connection()
  .from(trigger)
  .to(nodeA)
  .to(nodeB)
  .to(nodeC);
```

#### Custom Connection Types (AI Agents, Sub-workflows, etc.)

```typescript
const agent = wf.node('Agent').type('@n8n/n8n-nodes-langchain.agent').parameters({});
const tool = wf.node('Tool').type('n8n-nodes-base.httpRequestTool').parameters({});

wf.connection()
  .from({ node: tool, type: 'ai_tool', index: 0 })
  .to({ node: agent, type: 'ai_tool', index: 0 });
```

### Workflow Settings

```typescript
// Set workflow metadata
wf.meta({
  instanceId: 'abc123',
  templateCredsSetupCompleted: true,
  customField: 'value'
});

// Set workflow settings
wf.settings({
  executionOrder: 'v1',
  saveManualExecutions: true
});

// Set static data
wf.staticData({ counter: 0 });

// Set active status
wf.active(true);

// Set pin data for a node
wf.pinData('My Node', [
  { json: { value: 'test' } }
]);
```

### Exporting to JSON

```typescript
const workflowJSON = wf.toJSON();
```

### Importing from JSON

```typescript
import { fromJSON } from '@n8n/workflow-json-sdk';

const existingWorkflow = {
  name: 'Existing Workflow',
  nodes: [...],
  connections: {...}
};

const wf = fromJSON(existingWorkflow);

// Modify the workflow
const newNode = wf.node('New Node').type('n8n-nodes-base.set').parameters({});

// Export back to JSON
const updatedJSON = wf.toJSON();
```

## Examples

### Basic Workflow

```typescript
import { workflow } from '@n8n/workflow-json-sdk';

const wf = workflow({ name: 'Simple Workflow' });

const manualTrigger = wf
  .node('Manual Trigger')
  .type('n8n-nodes-base.manualTrigger')
  .parameters({});

const setA = wf
  .node('Set A')
  .type('n8n-nodes-base.set')
  .parameters({ options: {} });

const setB = wf
  .node('Set B')
  .type('n8n-nodes-base.set')
  .parameters({ options: {} });

const setC = wf
  .node('Set C')
  .type('n8n-nodes-base.set')
  .parameters({ example: 'value' });

// Connect trigger to Set A and Set B
wf.connection().from(manualTrigger).to([setA, setB]).build();

// Connect Set A to Set C
wf.connection().from(setA).to(setC).build();

const workflowJSON = wf.toJSON();
```

### AI Agent Workflow

```typescript
import { workflow } from '@n8n/workflow-json-sdk';

const wf = workflow({ name: 'AI Agent Workflow' });

wf.meta({
  instanceId: 'your-instance-id',
  templateCredsSetupCompleted: true
});

// Create chat trigger
const chatTrigger = wf
  .node('Chat Trigger')
  .type('@n8n/n8n-nodes-langchain.chatTrigger')
  .position(-176, -64)
  .parameters({
    public: true,
    options: {
      title: 'AI Assistant',
      subtitle: 'Ask me anything!',
      inputPlaceholder: 'Type your message...'
    },
    initialMessages: 'Hi there! 👋'
  })
  .version(1.1);

// Create AI agent
const agent = wf
  .node('AI Agent')
  .type('@n8n/n8n-nodes-langchain.agent')
  .position(192, -64)
  .parameters({
    options: {
      systemMessage: 'You are a helpful assistant.'
    }
  })
  .version(2.2);

// Create language model
const languageModel = wf
  .node('Language Model')
  .type('@n8n/n8n-nodes-langchain.lmChatGoogleGemini')
  .position(-176, 224)
  .parameters({
    options: {
      temperature: 0
    }
  });

// Create memory
const memory = wf
  .node('Memory')
  .type('@n8n/n8n-nodes-langchain.memoryBufferWindow')
  .position(224, 224)
  .parameters({
    contextWindowLength: 30
  });

// Create tools
const weatherTool = wf
  .node('Weather Tool')
  .type('n8n-nodes-base.httpRequestTool')
  .position(544, 224)
  .parameters({
    url: 'https://api.open-meteo.com/v1/forecast',
    toolDescription: 'Get weather forecast'
  });

// Connect everything
wf.connection()
  .from(chatTrigger)
  .to({ node: agent, type: 'main', index: 0 });

wf.connection()
  .from({ node: languageModel, type: 'ai_languageModel', index: 0 })
  .to({ node: agent, type: 'ai_languageModel', index: 0 });

wf.connection()
  .from({ node: memory, type: 'ai_memory', index: 0 })
  .to({ node: agent, type: 'ai_memory', index: 0 });

wf.connection()
  .from({ node: weatherTool, type: 'ai_tool', index: 0 })
  .to({ node: agent, type: 'ai_tool', index: 0 });

const workflowJSON = wf.toJSON();
```

### Modifying Existing Workflows

```typescript
import { fromJSON } from '@n8n/workflow-json-sdk';

// Load existing workflow
const existingWorkflow = await fetch('/api/workflows/123').then(r => r.json());

// Parse it
const wf = fromJSON(existingWorkflow);

// Add a new node
const emailNode = wf
  .node('Send Email')
  .type('n8n-nodes-base.emailSend')
  .parameters({
    fromEmail: 'noreply@example.com',
    toEmail: 'user@example.com',
    subject: 'Workflow completed',
    text: 'Your workflow has finished running.'
  });

// Connect it to the last node
const lastNode = wf.node('Existing Last Node'); // Reference existing node by name
wf.connection().from(lastNode).to(emailNode);

// Export modified workflow
const updatedWorkflow = wf.toJSON();

// Save it back
await fetch('/api/workflows/123', {
  method: 'PUT',
  body: JSON.stringify(updatedWorkflow)
});
```

## TypeScript Types

The SDK exports the following types for use in your code:

```typescript
import type {
  WorkflowJSON,
  WorkflowNodeData,
  WorkflowConnections,
  NodeConnectionType,
} from '@n8n/workflow-json-sdk';
```

### Connection Types

The `NodeConnectionType` is imported from `n8n-workflow` and defines the valid connection types:

- `'main'` - Standard node connections
- `'ai_tool'` - AI agent tool connections
- `'ai_memory'` - AI agent memory connections
- `'ai_languageModel'` - AI language model connections
- `'ai_outputParser'` - AI output parser connections
- `'ai_embedding'` - AI embedding connections
- `'ai_vectorStore'` - AI vector store connections
- `'ai_document'` - AI document connections
- `'ai_textSplitter'` - AI text splitter connections
- And more...

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:dev

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## License

See LICENSE.md file in the root of the repository.

## Contributing

Contributions are welcome! Please follow the n8n contribution guidelines.
