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

The SDK exports three functions:

```typescript
import { workflow, node, trigger } from '@n8n/workflow-sdk';
```

### `workflow(name: string, settings?)`

Creates a new workflow builder with optional settings.

```typescript
const wf = workflow('My Workflow');

// Or with settings
const wf = workflow('My Workflow', {
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

---

## Node Configuration

All node configuration is passed as a single object:

```typescript
node(type, version, {
  parameters: { ... },      // Node-specific parameters
  subnodes?: { ... },       // For AI nodes with subnode inputs
  credentials?: { ... },    // Credential references
  position?: [x, y],        // Canvas position
  disabled?: boolean,       // Whether node is disabled
  name?: string,            // Custom node name (auto-generated if omitted)
  outputSchema?: { ... },   // For dynamic nodes (HTTP, Code)
});
```

### Parameters

Parameters accept either literal values or expression functions:

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

Workflow-level settings control execution behavior:

```typescript
const wf = workflow('My Workflow', {
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

### Parallel Branches (Split)

```typescript
const branch1 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api1.com' } });
const branch2 = node('n8n-nodes-base.httpRequest', 'v4.2', { parameters: { url: 'https://api2.com' } });

wf.add(trigger(...))
  .split(branch1, branch2)
  .merge(node('n8n-nodes-base.merge', 'v3', { parameters: { mode: 'combine' } }))
  .then(node(...));
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

### Output Schemas

**Fixed schema nodes** (Slack, Gmail, etc.) have their output schemas baked into generated types:

```typescript
const sendMessage = node('n8n-nodes-base.slack', 'v2.2', {
  parameters: { channel: '#general', text: 'Hello' }
});
// sendMessage output is already typed as { ts: string, channel: string, ... }
```

**Dynamic nodes** (HTTP Request, Code) accept user-provided schemas:

```typescript
const fetchUsers = node('n8n-nodes-base.httpRequest', 'v4.2', {
  parameters: { url: 'https://api.example.com/users', method: 'GET' },
  outputSchema: {
    users: [{ id: 'number', email: 'string', name: 'string' }]
  }
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

**Operation-dependent schemas** vary based on parameters (e.g., Gmail get vs getAll).

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

Generated TypeScript types with overloads:

```typescript
// Auto-generated: do not edit
export interface HttpRequestV42Params {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | ...;
  url: string | Expression<string>;
  authentication?: 'none' | 'httpBasicAuth' | 'httpHeaderAuth' | ...;
  // ... all properties typed
}

export interface HttpRequestV42Credentials {
  httpBasicAuth?: { name: string; id: string };
  httpHeaderAuth?: { name: string; id: string };
}

export interface HttpRequestV42OutputSchema {
  // For nodes with known output structure
}

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
