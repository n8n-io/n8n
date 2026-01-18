# Workflow SDK Design Document

**Date:** 2026-01-18
**Status:** Draft
**Package:** `@n8n/workflow-sdk`

## Overview

A TypeScript SDK for programmatically creating, modifying, and serializing n8n workflows. Provides type-safe workflow building with full IDE support, bidirectional JSON conversion, and auto-generated types for all n8n nodes.

## Goals

1. **External SDK** - Public API for third-party tools to create and manipulate n8n workflows
2. **Type Safety** - Full TypeScript support with auto-generated node types
3. **Round-Trip Fidelity** - Import JSON → modify → export JSON without data loss
4. **Graph-Aware Expressions** - Type-safe expression builder with upstream node context

## Non-Goals

- Browser support (Node.js only)
- Runtime workflow execution
- Credential management (references only)

---

## Public API

```typescript
import {
  workflow,
  node,
  trigger,
  merge,
  sticky,
  splitInBatches,
  placeholder,
  runOnceForAllItems,
  runOnceForEachItem
} from '@n8n/workflow-sdk';
```

### `workflow(id: string, name: string, settings?)`

Creates a new workflow builder. ID is required, settings are optional.

```typescript
const wf = workflow('abc123', 'My Workflow');

// With settings
const wf = workflow('abc123', 'My Workflow', {
  timezone: 'America/New_York',
  errorWorkflow: 'error-handler-workflow-id',
  saveDataErrorExecution: 'all',
  saveDataSuccessExecution: 'none',
  saveManualExecutions: true,
  saveExecutionProgress: true,
  executionTimeout: 3600,
  executionOrder: 'v1',
});
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Workflow ID |
| `name` | `string` | Yes | Workflow name |
| `settings` | `object` | No | Workflow execution settings |

### `node(type, version, config)`

Creates a node instance.

```typescript
const http = node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: {
    url: 'https://api.example.com',
    method: 'GET',
  },
  credentials: {
    httpBasicAuth: { name: 'My Creds', id: '123' }
  },
  position: [300, 200],
  disabled: false,
});
```

### `trigger(type, version, config)`

Creates a trigger node (semantically distinct, same signature as `node`).

```typescript
const schedule = trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', {
  parameters: {
    rule: { interval: [{ field: 'hours', hour: 8 }] }
  }
});
```

### `sticky(content, config?)`

Creates a sticky note for annotating workflows. Sticky notes have no inputs/outputs and don't connect to other nodes.

**Basic usage:**

```typescript
const note = sticky('## API Integration\nThis section handles the **external API** calls.', {
  color: 4,
  position: [80, -176],
  width: 300,
  height: 200
});
```

**Wrapping nodes:** Pass nodes to automatically calculate position/dimensions to cover them:

```typescript
const httpNode = node('n8n-nodes-base.httpRequest', 'v4.2', { ... });
const transformNode = node('n8n-nodes-base.set', 'v3.4', { ... });

const note = sticky('## Data Fetching\nThese nodes handle API calls.', {
  color: 3,
  nodes: [httpNode, transformNode]  // Auto-calculates position/size
});
```

The SDK calculates bounding box from node positions (top-left corner, 40x40px per node) and adds padding.

**Parameters:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `content` | `string` | Yes | Markdown content |
| `color` | `1-7` | No | Color theme (default: 1) |
| `position` | `[x, y]` | No | Canvas position (top-left) |
| `width` | `number` | No | Width in pixels |
| `height` | `number` | No | Height in pixels |
| `nodes` | `Node[]` | No | Nodes to wrap (auto-calculates position/size) |
| `name` | `string` | No | Custom name |

**Note:** If `nodes` is provided, `position`/`width`/`height` are calculated automatically and any manual values are ignored.

**Colors:** 1-7 map to n8n's sticky note color palette.

**Adding to workflow:**

```typescript
const wf = workflow('My Workflow')
  .add(sticky('## Notes\nWorkflow documentation here.', { color: 2 }))
  .add(trigger(...))
  .then(node(...));
```

Sticky notes are added to the workflow but don't participate in the node chain.

### `splitInBatches(config)`

Creates a Split In Batches node with semantic `.done()` and `.each()` methods for the two output branches.

```typescript
wf.add(trigger(...))
  .then(generateItems)
  .then(
    splitInBatches({ parameters: { batchSize: 10 } })
      .done().then(finalizeNode)
      .each().then(processNode).loop()  // Explicit loop-back
  );
```

**Parameters:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `config.version` | `number \| string` | No | Node version (defaults to `3`) |
| `config.id` | `string` | No | Node ID (auto-generated if omitted) |
| `config.parameters` | `object` | No | Node parameters (batchSize, options) |
| `config.name` | `string` | No | Custom node name |
| `config.position` | `[x, y]` | No | Canvas position |
| `config.disabled` | `boolean` | No | Whether node is disabled |

**Methods:**

| Method | Description |
|--------|-------------|
| `.done()` | Chain from output 0 (all items processed) |
| `.each()` | Chain from output 1 (current batch) |
| `.loop()` | Connects back to the splitInBatches node (terminates `.each()` chain) |

**Example with multiple nodes in loop:**

```typescript
const initOnce = node('n8n-nodes-base.set', 'v3.4', {
  parameters: { ... },
  executeOnce: true  // Only run on first iteration
});

const processItem = node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: { url: $ => $.json.apiUrl }
});

const finalReport = node('n8n-nodes-base.set', 'v3.4', {
  parameters: { ... }
});

wf.add(trigger(...))
  .then(generateItems)
  .then(
    splitInBatches({ parameters: { batchSize: 5 } })
      .done().then(finalReport)
      .each().then(initOnce).then(processItem).loop()
  );
```

---

## Node Configuration

All node configuration is passed as a single object:

```typescript
node<OutputType>(type, version, {
  // Core
  parameters: { ... },      // Node-specific parameters
  subnodes?: { ... },       // For AI nodes with subnode inputs
  credentials?: { ... },    // Credential references

  // Display
  name?: string,            // Custom node name (auto-generated if omitted)
  position?: [x, y],        // Canvas position
  disabled?: boolean,       // Whether node is disabled
  notes?: string,           // Node notes/documentation
  notesInFlow?: boolean,    // Show notes on canvas

  // Execution behavior
  executeOnce?: boolean,    // Execute only once (not per item)
  retryOnFail?: boolean,    // Retry on failure
  alwaysOutputData?: boolean, // Output data even if empty
  onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput',

  // Testing
  pinData?: object[],       // Pinned output data for testing
});
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `executeOnce` | `boolean` | `false` | Execute only once instead of per item |
| `retryOnFail` | `boolean` | `false` | Retry execution on failure |
| `alwaysOutputData` | `boolean` | `false` | Output data even when empty |
| `onError` | `string` | `'stopWorkflow'` | Error handling: stop, continue, or create error output |
| `notes` | `string` | - | Node documentation |
| `notesInFlow` | `boolean` | `false` | Display notes on canvas |
| `pinData` | `object[]` | - | Pinned output data for testing |

**Pinned data:** Use `pinData` to mock node output during testing:

```typescript
node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: { url: 'https://api.example.com/users' },
  pinData: [
    { json: { id: 1, name: 'Alice' } },
    { json: { id: 2, name: 'Bob' } }
  ]
})
```

When pinData is set, the node returns the pinned data instead of executing.

**Error output branch:** When `onError: 'continueErrorOutput'` is set, the node gets a second output:

```typescript
const agent = node('n8n-nodes-langchain.agent', 'v3', {
  parameters: { ... },
  onError: 'continueErrorOutput'
});

wf.add(trigger(...))
  .then(agent)
  .output(0).then(successHandler)   // Success output
  .output(1).then(errorHandler);    // Error output
```

Output typing is provided via the generic parameter `<OutputType>` rather than a schema property. This is simpler for LLM authorship and sufficient since n8n doesn't validate outputs at runtime (except for agent structured output which requires a schema - see below).

### Parameters

Parameters accept literal values, expression functions, or placeholders:

```typescript
node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: {
    url: $ => $.json.apiEndpoint,      // Expression
    method: 'GET',                      // Literal
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: $ => `Bearer ${$.env.API_TOKEN}` }
      ]
    }
  }
});
```

### Placeholders

Use `placeholder()` for template values that users must fill in:

```typescript
node('n8n-nodes-base.slack', 'v2.2', {
  parameters: {
    channel: placeholder('Enter Channel'),
    text: placeholder('Enter Message')
  }
});
```

Serializes to:
```json
{
  "channel": "<__PLACEHOLDER_VALUE__Enter Channel__>",
  "text": "<__PLACEHOLDER_VALUE__Enter Message__>"
}
```

Useful for workflow templates where certain values need user input.

### Credentials

Credentials are referenced by name and ID for round-trip fidelity:

```typescript
credentials: {
  httpBasicAuth: { name: 'My API Creds', id: '123' }
}
```

### Subnodes (AI Nodes)

AI nodes like Agent have typed subnode inputs:

```typescript
const agent = node('n8n-nodes-langchain.agent', 'v1.5', {
  parameters: {
    prompt: 'Analyze this data',
  },
  subnodes: {
    languageModel: node('n8n-nodes-langchain.lmOpenAi', 'v1', {
      parameters: { model: 'gpt-4' }
    }),
    memory: node('n8n-nodes-langchain.memoryBufferWindow', 'v1', {
      parameters: { windowSize: 5 }
    }),
    tools: [
      node('n8n-nodes-langchain.toolCalculator', 'v1', { parameters: {} }),
    ],
  },
  credentials: {
    openAiApi: { name: 'OpenAI', id: '456' }
  }
});
```

Required subnodes are enforced by the type system.

---

## Workflow Settings

Workflow-level settings control execution behavior. Settings are the optional third parameter:

```typescript
const wf = workflow('workflow-123', 'My Workflow', {
  // Timezone for date/time operations
  timezone: 'America/New_York',  // or 'DEFAULT' to use instance default

  // Error handling
  errorWorkflow: 'workflow-id',  // Workflow to run on error

  // Execution data retention
  saveDataErrorExecution: 'all' | 'none' | 'DEFAULT',
  saveDataSuccessExecution: 'all' | 'none' | 'DEFAULT',
  saveManualExecutions: true | false | 'DEFAULT',
  saveExecutionProgress: true | false | 'DEFAULT',

  // Execution limits
  executionTimeout: 3600,  // Seconds, -1 for no timeout

  // Execution order (v1 is breadth-first, v0 is legacy)
  executionOrder: 'v1' | 'v0',

  // Caller restrictions (for sub-workflow execution)
  callerPolicy: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner',
  callerIds: 'workflow-id-1,workflow-id-2',  // When policy is 'workflowsFromAList'
});
```

Settings can also be modified after creation:

```typescript
wf.settings({
  timezone: 'Europe/London',
  executionTimeout: 7200,
});
```

---

## Workflow Building & Connections

### Linear Chains

```typescript
const wf = workflow('Email Summary')
  .add(trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', { parameters: { ... } }))
  .then(node('n8n-nodes-base.gmail', 'v2.1', { parameters: { ... } }))
  .then(node('n8n-nodes-base.set', 'v3.4', { parameters: { ... } }));
```

### Branching (Multiple Outputs)

Use `.output(index)` to select which output to connect from:

```typescript
wf.add(trigger(...))
  .then(node('n8n-nodes-base.if', 'v2', { parameters: { ... } }))
  .output(0).then(node(...))  // True branch
  .output(1).then(node(...)); // False branch
```

### Parallel Branches with Merge

Use `merge()` to run branches in parallel and combine their outputs. The previous node fans out to all branches.

```typescript
const api1 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api1.com' } });
const api2 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api2.com' } });

wf.add(trigger(...))
  .then(
    merge([api1, api2], { mode: 'combine' })
  )
  .then(processResults);
```

**Connection structure:**

```
              ┌── api1 ──┐
trigger ──────┼          ├── merge ── processResults
              └── api2 ──┘
```

### `merge(branches, config)`

Creates a merge composite: the upstream node connects to all branches, branches connect to a merge node.

```typescript
merge(
  branches: NodeInstance[],
  config: {
    mode: 'append' | 'combine' | 'multiplex' | 'chooseBranch';
    // Additional mode-specific options...
  }
): MergeComposite;
```

**Input positions match array order:**

```typescript
const users = node('n8n-nodes-base.httpRequest', 'v4.2', { ... });   // → Input 1 (index 0)
const orders = node('n8n-nodes-base.httpRequest', 'v4.2', { ... });  // → Input 2 (index 1)
const products = node('n8n-nodes-base.httpRequest', 'v4.2', { ... }); // → Input 3 (index 2)

wf.add(trigger(...))
  .then(
    merge([users, orders, products], { mode: 'append' })
  );
```

**Why input position matters:**

```
┌─────────────┐
│   Merge     │
├─────────────┤
│ Input 1 ←───── branches[0]
│ Input 2 ←───── branches[1]
│ Input 3 ←───── branches[2]
└─────────────┘
```

| Mode | Input 1 | Input 2+ | Behavior |
|------|---------|----------|----------|
| `append` | Items | Items | Concatenate all items into single list |
| `combine` | Primary data | Data to merge | Merge Input 2 fields into Input 1 items |
| `multiplex` | Items | Items | Cartesian product of all inputs |
| `chooseBranch` | Option A | Option B | Pass through selected input only |

- In `combine` mode: `branches[0]` items are the "base" that receive merged fields
- In `chooseBranch` mode: The `output` parameter selects which branch passes through
- In `multiplex` mode: Order affects the structure of the cartesian product

**Type signature:**

```typescript
// merge() returns a MergeComposite that .then() understands
function merge<T extends NodeInstance[]>(
  branches: [...T],
  config: MergeConfig
): MergeComposite<T>;

interface MergeComposite<Branches extends NodeInstance[]> {
  readonly branches: Branches;
  readonly config: MergeConfig;
  readonly inputCount: Branches['length'];
}

// WorkflowBuilder.then() accepts nodes or merge composites
interface WorkflowBuilder {
  then(node: NodeInstance): WorkflowBuilder;
  then(merge: MergeComposite): WorkflowBuilder;  // Fans out to all branches
}
```

**Branches can be chains:**

```typescript
wf.add(trigger(...))
  .then(
    merge([
      node('n8n-nodes-base.httpRequest', 'v4.2', { ... })
        .then(node('n8n-nodes-base.set', 'v3.4', { ... })),  // Chain as branch
      node('n8n-nodes-base.httpRequest', 'v4.2', { ... })
    ], { mode: 'append' })
  );
```

### Named Node References

```typescript
const fetchNode = node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: { url: '...' },
  name: 'fetchData',
});

wf.add(trigger(...))
  .then(fetchNode)
  .then(node('n8n-nodes-base.set', 'v3.4', {
    parameters: {
      assignments: {
        assignments: [{
          name: 'original',
          value: $ => $('fetchData').json.data,  // Reference by name
          type: 'string'
        }]
      }
    }
  }));
```

---

## Expressions & Graph-Aware Typing

### Expression Context

The `$` parameter in expression functions provides typed access to:

| Property | Description |
|----------|-------------|
| `$.json` | Current item's JSON data (typed from upstream) |
| `$.binary` | Current item's binary data (keyed by field name) |
| `$.input.first()` | First input item |
| `$.input.all()` | All input items |
| `$.input.item` | Current item |
| `$('nodeName')` | Reference another node's output |
| `$.env.VAR_NAME` | Environment variables |
| `$.vars.VAR_NAME` | Workflow variables (instance-level) |
| `$.secrets.PROVIDER.SECRET` | External secrets (e.g., `$.secrets.vault.apiKey`) |
| `$.now` | Current DateTime |
| `$.itemIndex` | Current item index |
| `$.runIndex` | Current run index |
| `$.execution.id` | Execution ID |
| `$.execution.mode` | Execution mode ('test' or 'production') |
| `$.execution.resumeUrl` | Resume URL for wait nodes |
| `$.workflow.id` | Workflow ID |
| `$.workflow.name` | Workflow name |
| `$.workflow.active` | Whether workflow is active |

### Binary Data

`$.binary` provides access to binary file data attached to items:

```typescript
node('n8n-nodes-base.extractFromFile', 'v1', {
  parameters: {
    operation: 'binaryToPropery',
    binaryPropertyName: $ => `{{ ${$.binary}.keys()[0] }}`
  }
})

node('n8n-nodes-base.set', 'v3.4', {
  parameters: {
    assignments: {
      assignments: [
        {
          name: 'path',
          type: 'string',
          value: $ => `{{ ${$.binary}[${$.binary}.keys()[0]].directory }}{{ ${$.binary}[${$.binary}.keys()[0]].fileName }}`
        }
      ]
    }
  }
})
```

**Binary object structure:**

```typescript
$binary: {
  [fieldName: string]: {
    fileName: string;      // e.g., "image.png"
    directory?: string;    // e.g., "uploads/"
    mimeType: string;      // e.g., "image/png"
    fileExtension: string; // e.g., "png"
    fileSize: string;      // Size in bytes
    data: string;          // Base64 encoded data
  }
}
```

**Common patterns:**
- `$binary.keys()` - Get all binary field names
- `$binary.keys()[0]` - Get first binary field name
- `$binary[fieldName].fileName` - Get file name
- `$binary[fieldName].directory` - Get directory path

### Output Schemas

**Fixed schema nodes** (Slack, Gmail, etc.) have their output schemas baked into generated types:

```typescript
const sendMessage = node('n8n-nodes-base.slack', 'v2.2', {
  parameters: { channel: '#general', text: 'Hello' }
});
// sendMessage output is already typed as { ts: string, channel: string, ... }
```

**Dynamic nodes** (HTTP Request, Code) use the generic parameter for output typing:

```typescript
interface User {
  id: number;
  email: string;
  name: string;
}

const fetchUsers = node<{ users: User[] }>('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: { url: 'https://api.example.com/users', method: 'GET' }
});

// Downstream nodes get typed access
wf.add(trigger(...))
  .then(fetchUsers)
  .then(node('n8n-nodes-base.set', 'v3.4', {
    parameters: {
      assignments: {
        assignments: [{
          name: 'email',
          value: $ => $.json.users[0].email,  // Typed!
          type: 'string'
        }]
      }
    }
  }));
```

No runtime schema is needed for these nodes - n8n doesn't validate their output. The generic is purely for SDK type inference.

**Operation-dependent schemas** vary based on parameters (e.g., Gmail get vs getAll).

---

## Code Node

The Code node uses typed helper functions that provide mode-specific context and enforce return types.

### Helper Functions

```typescript
import { workflow, node, trigger, runOnceForAllItems, runOnceForEachItem } from '@n8n/workflow-sdk';
```

**`runOnceForAllItems<T>`** - Receives all items, returns array:

```typescript
node('n8n-nodes-base.code', 'v2', {
  parameters: {
    jsCode: runOnceForAllItems<{ total: number }>((ctx) => {
      const items = ctx.$input.all();
      return items.map(item => ({
        json: { total: item.json.price * item.json.quantity }
      }));
    })
  }
  // outputType inferred from generic
})
```

**`runOnceForEachItem<T>`** - Receives one item, returns one (or null to skip):

```typescript
node('n8n-nodes-base.code', 'v2', {
  parameters: {
    jsCode: runOnceForEachItem<{ label: string }>((ctx) => {
      if (ctx.$input.item.json.price < 10) return null;
      return {
        json: { label: ctx.$input.item.json.name.toUpperCase() }
      };
    })
  }
})
```

### Context Object

The `ctx` parameter provides typed access to n8n's execution context:

**Both modes:**

| Property | Type | Description |
|----------|------|-------------|
| `ctx.$env.VAR_NAME` | `string` | Environment variables |
| `ctx.$vars.name` | `unknown` | Workflow variables |
| `ctx.$secrets.provider.key` | `string` | External secrets |
| `ctx.$now` | `DateTime` | Current DateTime (Luxon) |
| `ctx.$today` | `DateTime` | Today's date |
| `ctx.$runIndex` | `number` | Current run index |
| `ctx.$execution.id` | `string` | Execution ID |
| `ctx.$execution.mode` | `'test' \| 'production'` | Execution mode |
| `ctx.$execution.resumeUrl` | `string` | Resume URL |
| `ctx.$workflow.id` | `string` | Workflow ID |
| `ctx.$workflow.name` | `string` | Workflow name |
| `ctx.$workflow.active` | `boolean` | Active status |
| `ctx.$('nodeName')` | typed | Reference other node's output |
| `ctx.$jmespath(data, expr)` | `unknown` | JMESPath query |

**`runOnceForAllItems` only:**

| Property | Type | Description |
|----------|------|-------------|
| `ctx.$input.all()` | `INodeExecutionData[]` | All input items |
| `ctx.$input.first()` | `INodeExecutionData` | First item |
| `ctx.$input.last()` | `INodeExecutionData` | Last item |
| `ctx.$input.itemMatching(i)` | `INodeExecutionData` | Item at index |

**`runOnceForEachItem` only:**

| Property | Type | Description |
|----------|------|-------------|
| `ctx.$input.item` | `INodeExecutionData` | Current item |
| `ctx.$itemIndex` | `number` | Current item index |

### Type Safety

The helper functions enforce:
1. **Context methods** - Only mode-appropriate methods available
2. **Return type** - Must match generic `T` (or `null` for each-item mode)
3. **Output inference** - Downstream nodes get typed `json` from generic

```typescript
// TypeScript errors:
runOnceForAllItems<{ sum: number }>((ctx) => {
  ctx.$input.item;          // ✗ Error: doesn't exist in all-items mode
  return [{ json: { wrong: 'field' } }];  // ✗ Error: doesn't match { sum: number }
})

runOnceForEachItem<{ label: string }>((ctx) => {
  ctx.$input.all();         // ✗ Error: doesn't exist in each-item mode
})
```

### Unknown Output

Omit the generic when output schema isn't known:

```typescript
node('n8n-nodes-base.code', 'v2', {
  parameters: {
    jsCode: runOnceForAllItems((ctx) => {
      return ctx.$input.all();  // Returns unknown
    })
  }
})
```

### Serialization

The function body is extracted and `ctx.` prefixes are stripped:

```typescript
// SDK
runOnceForAllItems<{ sum: number }>((ctx) => {
  const total = ctx.$input.all().reduce((acc, i) => acc + i.json.value, 0);
  return [{ json: { sum: total } }];
})

// Serializes to JSON:
{
  "mode": "runOnceForAllItems",
  "language": "javaScript",
  "jsCode": "const total = $input.all().reduce((acc, i) => acc + i.json.value, 0);\nreturn [{ json: { sum: total } }];"
}
```

### Python

Python code uses string parameters (no type-safe helper):

```typescript
node('n8n-nodes-base.code', 'v2', {
  parameters: {
    mode: 'runOnceForAllItems',
    language: 'python',
    pythonCode: `
      return [{"json": {"sum": sum(item["json"]["value"] for item in _items)}}]
    `
  },
  outputType: { sum: number }  // explicit for Python
})
```

---

## Agent Nodes & Structured Output

Agent nodes use subnodes for model, memory, tools, and output parsing. Output typing is set via an explicit generic on the node call.

### Basic Structure

```typescript
node<{ output: { summary: string; confidence: number } }>('n8n-nodes-langchain.agent', 'v3.1', {
  parameters: {
    text: '{{ $json.prompt }}'
  },
  subnodes: {
    model: node('n8n-nodes-langchain.lmChatOpenAi', 'v1', {
      parameters: { model: 'gpt-4' }
    }),
    memory: node('n8n-nodes-langchain.memoryBufferWindow', 'v1', {
      parameters: { windowSize: 5 }
    }),
    tools: [
      node('n8n-nodes-langchain.toolCalculator', 'v1', {})
    ],
    outputParser: node('n8n-nodes-langchain.outputParserStructured', 'v1.3', {
      parameters: {
        schemaType: 'manual',
        inputSchema: '{"type":"object","properties":{"output":{"type":"object","properties":{"summary":{"type":"string"},"confidence":{"type":"number"}}}}}'
      }
    })
  },
  credentials: {
    openAiApi: { name: 'OpenAI', id: 'openai-1' }
  }
})
```

### Subnodes

| Subnode | Type | Required | Description |
|---------|------|----------|-------------|
| `model` | single node | Yes | Chat model (OpenAI, Anthropic, etc.) |
| `memory` | single node | No | Conversation memory |
| `tools` | array of nodes | No | Tools available to agent |
| `outputParser` | single node | No | Structured output parser |

### Structured Output Parser

The `outputParserStructured` node is a regular subnode with its own parameters. The SDK does not infer types from it - the user specifies both the parser's `inputSchema` and the agent's output type separately.

**Manual mode** - JSON Schema as string:

```typescript
node<{ output: { name: string; score: number } }>('n8n-nodes-langchain.agent', 'v3.1', {
  subnodes: {
    outputParser: node('n8n-nodes-langchain.outputParserStructured', 'v1.3', {
      parameters: {
        schemaType: 'manual',
        inputSchema: '{"type":"object","properties":{"type":"object","properties":{"name":{"type":"string"},"score":{"type":"number"}}}}'
      }
    })
  }
})
```

**Example mode** - JSON example string (n8n infers schema):

```typescript
node<{ output: { name: string; score: number } }>('n8n-nodes-langchain.agent', 'v3.1', {
  subnodes: {
    outputParser: node('n8n-nodes-langchain.outputParserStructured', 'v1.3', {
      parameters: {
        schemaType: 'fromJson',
        jsonExample: '{"output": {"name": "example", "score": 0.95}}'
      }
    })
  }
})
```

### Output Type

- Agent output type is set via explicit generic: `node<OutputType>(...)`
- The `outputParser` subnode is independent - user must keep them in sync
- Without generic: output type defaults to `unknown`

---

## JSON Conversion

### Export (TS → JSON)

```typescript
const wf = workflow('My Workflow')
  .add(trigger(...))
  .then(node(...));

// Export to n8n-compatible JSON
const json = wf.toJSON();
// Returns: { name, nodes, connections, settings, ... }

// Or serialize to string
const jsonString = wf.toString();
```

The serializer:
- Converts expression functions to `={{ ... }}` strings
- Flattens the graph into `nodes[]` and `connections{}`
- Generates UUIDs for node IDs if not specified
- Auto-generates positions if not specified (simple layout algorithm)

### Import (JSON → TS)

```typescript
const wf = workflow.fromJSON(existingWorkflowJson);

// Modify with full type safety
wf.getNode('HTTP Request').update({
  parameters: {
    url: 'https://new-api.example.com'
  }
});

// Round-trip back to JSON
const updatedJson = wf.toJSON();
```

### Expression Parsing

Imported expressions (`={{ $json.name }}`) are parsed into AST and converted to typed functions:

- `$json.foo` → `$.json.foo`
- `$('NodeName').item.json.x` → `$('NodeName').item.json.x`
- `$now`, `$env.VAR`, `$itemIndex` → corresponding context properties
- JavaScript expressions preserved: `$json.items.map(i => i.name).join(', ')`

---

## Type Generation

### Input

Node definition files from:
- `packages/nodes-base/nodes/**/*.ts`
- `packages/@n8n/nodes-langchain/nodes/**/*.ts`

Each exports `INodeTypeDescription`:

```typescript
{
  displayName: 'HTTP Request',
  name: 'n8n-nodes-base.httpRequest',
  version: [1, 2, 3, 4.1, 4.2],
  properties: [
    { name: 'method', type: 'options', options: [...], default: 'GET' },
    { name: 'url', type: 'string', default: '' },
  ],
  credentials: [
    { name: 'httpBasicAuth', required: false },
  ]
}
```

### Output

**All generated types include JSDoc documentation.** Every interface, property, and function overload is documented using descriptions extracted from node definitions. This provides IDE tooltips, autocomplete hints, and inline documentation for all 400+ nodes.

```typescript
// Auto-generated: do not edit

/**
 * HTTP Request node - Makes HTTP requests and returns the response data.
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
 */
export interface HttpRequestV42Params {
  /**
   * The HTTP method to use for the request.
   * @default 'GET'
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

  /**
   * The URL to make the request to.
   */
  url: string | Expression<string>;

  /**
   * The authentication method to use.
   * @default 'none'
   */
  authentication?: 'none' | 'httpBasicAuth' | 'httpHeaderAuth' | 'oAuth1Api' | 'oAuth2Api';

  /**
   * Whether to send query parameters with the request.
   * @default false
   */
  sendQuery?: boolean;

  /**
   * Whether to send headers with the request.
   * @default false
   */
  sendHeaders?: boolean;

  /**
   * Whether to send a body with the request.
   * @default false
   */
  sendBody?: boolean;

  // ... all properties typed with JSDoc
}

export interface HttpRequestV42Credentials {
  httpBasicAuth?: { name: string; id: string };
  httpHeaderAuth?: { name: string; id: string };
}

export interface HttpRequestV42OutputSchema {
  // For nodes with known output structure
}

/**
 * Creates an HTTP Request node (v4.2).
 *
 * Makes HTTP requests and returns the response data. Supports authentication,
 * custom headers, query parameters, and request bodies.
 *
 * @see https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/
 * @category Core Nodes
 */
declare function node(
  type: 'n8n-nodes-base.httpRequest',
  version: 'v4.2',
  config: {
    parameters: HttpRequestV42Params;
    credentials?: HttpRequestV42Credentials;
    outputSchema?: Schema;
    position?: [number, number];
    disabled?: boolean;
    name?: string;
  }
): NodeInstance<'n8n-nodes-base.httpRequest', 'v4.2', ...>;
```

### JSDoc Generation (Required)

The type generator **must** extract documentation from `INodeTypeDescription` properties for every generated type:

| Source Field | JSDoc Target |
|--------------|--------------|
| `displayName` | Interface description (node name) |
| `description` | Interface description (node purpose) |
| `properties[].description` | Property JSDoc comment |
| `properties[].default` | `@default` tag |
| `properties[].hint` | Added to property description |
| `codex.categories` | `@category` tag |
| `documentationUrl` | `@see` tag with link |

**Options get inline documentation:**

```typescript
/**
 * The HTTP method to use for the request.
 * @default 'GET'
 */
method?:
  | 'GET'     // Retrieve data
  | 'POST'    // Create new resource
  | 'PUT'     // Replace existing resource
  | 'DELETE'  // Remove resource
  | 'PATCH'   // Partially update resource
  | 'HEAD';   // Retrieve headers only
```

**Conditional fields include display conditions:**

```typescript
/**
 * The request body content.
 * Only used when `sendBody` is true.
 */
body?: string | Expression<string>;
```

### Schema Categories

1. **Fixed schema** - Slack, Gmail (specific operations), most integrations
2. **Operation-dependent schema** - Varies by operation parameter
3. **User-defined schema** - HTTP Request, Code, Function nodes

---

## Package Structure

```
packages/
└── @n8n/workflow-sdk/
    ├── src/
    │   ├── index.ts              # Public API: workflow, node, trigger
    │   ├── workflow-builder.ts   # Workflow class and chaining logic
    │   ├── node-builder.ts       # Node creation and validation
    │   ├── expression/
    │   │   ├── context.ts        # $ context type definitions
    │   │   ├── parser.ts         # Parse '={{ }}' strings to AST
    │   │   └── serializer.ts     # Convert functions to '={{ }}' strings
    │   ├── serialization/
    │   │   ├── to-json.ts        # TS → JSON export
    │   │   ├── from-json.ts      # JSON → TS import
    │   │   └── layout.ts         # Auto-position nodes
    │   ├── types/
    │   │   ├── base.ts           # Core interfaces
    │   │   └── generated/        # Auto-generated node types
    │   │       ├── index.ts
    │   │       ├── nodes-base.ts
    │   │       └── nodes-langchain.ts
    │   └── validation/
    │       └── schema.ts         # Validate workflows before export
    ├── scripts/
    │   └── generate-types.ts     # Reads node definitions, outputs types
    ├── docs/
    │   └── 2026-01-18-workflow-sdk-design.md
    ├── package.json
    └── tsconfig.json
```

### Build Process

1. `generate-types.ts` runs before build
2. Reads node definitions from `packages/nodes-base` and `packages/@n8n/nodes-langchain`
3. Generates `src/types/generated/*.ts`
4. Normal TypeScript build compiles everything

### Dependencies

- `@n8n/workflow` - Core interfaces only
- No runtime dependencies on node implementations

---

## Complete Example

```typescript
import { workflow, node, trigger } from '@n8n/workflow-sdk';

const wf = workflow('Monday Email Summary')
  .add(
    trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', {
      parameters: {
        rule: { interval: [{ field: 'cronExpression', expression: '0 8 * * MON' }] }
      }
    })
  )
  .then(
    node('n8n-nodes-base.set', 'v3.4', {
      parameters: {
        assignments: {
          assignments: [
            { name: 'daysToLookBack', value: 3, type: 'number' },
            { name: 'recipientEmail', value: 'user@example.com', type: 'string' }
          ]
        }
      },
      name: 'config'
    })
  )
  .then(
    node('n8n-nodes-base.gmail', 'v2.1', {
      parameters: {
        operation: 'getAll',
        returnAll: false,
        limit: 50,
        filters: {
          receivedAfter: $ => $.now.minus({ days: $('config').json.daysToLookBack }).toISO()
        }
      },
      credentials: {
        gmailOAuth2: { name: 'Gmail Account', id: 'gmail-1' }
      },
      name: 'fetchEmails'
    })
  )
  .then(
    node('n8n-nodes-base.if', 'v2', {
      parameters: {
        conditions: {
          number: [{
            value1: $ => $.input.all().length,
            operation: 'larger',
            value2: 0
          }]
        }
      }
    })
  )
  .output(0).then(
    node('n8n-nodes-langchain.agent', 'v1.5', {
      parameters: {
        prompt: $ => `Summarize these ${$.input.all().length} emails for a Monday morning briefing.`
      },
      subnodes: {
        languageModel: node('n8n-nodes-langchain.lmOpenAi', 'v1', {
          parameters: { model: 'gpt-4' }
        })
      },
      credentials: {
        openAiApi: { name: 'OpenAI', id: 'openai-1' }
      }
    })
  )
  .then(
    node('n8n-nodes-base.gmail', 'v2.1', {
      parameters: {
        operation: 'send',
        sendTo: $ => $('config').json.recipientEmail,
        subject: 'Your Monday Email Summary',
        message: $ => $.json.output
      },
      credentials: {
        gmailOAuth2: { name: 'Gmail Account', id: 'gmail-1' }
      }
    })
  );

// Export
const json = wf.toJSON();
console.log(JSON.stringify(json, null, 2));
```

---

## Open Questions

1. **Version format** - Use `'v4.2'` string or `4.2` number?
2. **Error handling** - How to validate workflows before export? What errors to surface?
3. **Position layout** - Algorithm for auto-positioning nodes when not specified?
4. **Subnode connection types** - How to handle the 13 different AI connection types in types?

---

## Next Steps

1. Set up package scaffolding
2. Implement core type system and builders
3. Build expression parser/serializer
4. Create type generation script
5. Implement JSON import/export
6. Add validation layer
7. Write tests and documentation
