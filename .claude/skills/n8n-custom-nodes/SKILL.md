---
name: n8n-custom-nodes
description: Creates, debugs, tests, and maintains n8n custom nodes following best practices. Use when asked to build a new n8n node, fix a node bug, add operations to an existing node, create credentials, write node tests, or any task involving packages/nodes-base or custom node packages. Activate on keywords like "node", "trigger", "credential", "n8n", "workflow node", "custom node".
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Task, WebFetch, WebSearch
---

# n8n Custom Node Development Skill

Expert-level skill for creating, debugging, testing, and maintaining n8n custom nodes.

## Skill Folder Contents

This is a self-contained, portable skill folder. Copy the entire `n8n-custom-nodes/` directory into any project's `.claude/skills/` to use it.

```
n8n-custom-nodes/
  SKILL.md                                  ← This file (reference guide + rules)
  templates/
    nodes/
      ProgrammaticNode.ts                   ← Standard execute() node with CRUD ops
      DeclarativeNode.ts                    ← Routing-based node (no execute method)
      WebhookTriggerNode.ts                 ← Real-time webhook trigger with lifecycle
      PollingTriggerNode.ts                 ← Periodic polling trigger with dedup
      EventTriggerNode.ts                   ← External library/protocol trigger
      VersionedNode.ts                      ← VersionedNodeType wrapper pattern
      GenericFunctions.ts                   ← API helpers (offset, cursor, page pagination)
      types.ts                              ← TypeScript interface definitions
      NodeMetadata.json                     ← .node.json codex metadata template
    credentials/
      ApiKeyCredential.ts                   ← Bearer token / API key auth
      OAuth2Credential.ts                   ← OAuth2 authorization code flow
      HeaderAuthCredential.ts               ← Custom header / query param auth
    tests/
      UnitTest.ts                           ← Full unit test with mocked IExecuteFunctions
      TriggerTest.ts                        ← Tests for webhook, polling, event triggers
      WorkflowIntegrationTest.ts            ← NodeTestHarness workflow execution test
      workflow.json                         ← Sample workflow JSON for integration tests
    descriptions/
      ResourceDescription.ts                ← Separated operation + field definitions
  scripts/
    scaffold-node.sh                        ← Shell script to scaffold new node from templates
```

## How to Use Templates

**Read the template files directly** — they contain full, working TypeScript with detailed comments explaining every section. Each template uses `__placeholder__` markers for easy find-and-replace:

| Placeholder | Meaning | Example |
|------------|---------|---------|
| `__ServiceName__` | PascalCase class name | `Airtable` |
| `__serviceName__` | camelCase internal name | `airtable` |
| `__serviceNameApi__` | Credential name | `airtableApi` |
| `__servicename__` | Lowercase for icon files | `airtable` |

### Quick Scaffold

```bash
# Scaffold a complete new node from templates:
bash .claude/skills/n8n-custom-nodes/scripts/scaffold-node.sh MyService myService packages/nodes-base
```

### Which Template to Use

| Need | Template File |
|------|--------------|
| Standard API integration node | `templates/nodes/ProgrammaticNode.ts` |
| Simple REST wrapper (no custom logic) | `templates/nodes/DeclarativeNode.ts` |
| Real-time webhook events | `templates/nodes/WebhookTriggerNode.ts` |
| Periodic polling for new data | `templates/nodes/PollingTriggerNode.ts` |
| External library events (MQTT, WS, etc.) | `templates/nodes/EventTriggerNode.ts` |
| Major version with separate implementations | `templates/nodes/VersionedNode.ts` |
| API request helpers | `templates/nodes/GenericFunctions.ts` |
| TypeScript interfaces for responses | `templates/nodes/types.ts` |
| Separated description properties | `templates/descriptions/ResourceDescription.ts` |
| Bearer / API key credential | `templates/credentials/ApiKeyCredential.ts` |
| OAuth2 credential | `templates/credentials/OAuth2Credential.ts` |
| Custom header auth credential | `templates/credentials/HeaderAuthCredential.ts` |
| Unit test (execute method) | `templates/tests/UnitTest.ts` |
| Trigger test (webhook/polling/event) | `templates/tests/TriggerTest.ts` |
| Workflow integration test | `templates/tests/WorkflowIntegrationTest.ts` |
| Test workflow JSON | `templates/tests/workflow.json` |

---

## Project Structure (n8n monorepo)

```
packages/
  nodes-base/                    # Built-in nodes (429 nodes)
    nodes/ServiceName/           # Each service has its own directory
      ServiceName.node.ts        # Main node implementation
      ServiceName.node.json      # Codex metadata
      servicename.svg            # SVG icon
      GenericFunctions.ts        # API request helpers
      types.ts                   # TypeScript interfaces
      descriptions/              # Separated property definitions
      v1/, v2/                   # Versioned implementations
      test/                      # Tests
    credentials/                 # Credential implementations
    utils/                       # Shared utilities (descriptions.ts, binary.ts)
    test/nodes/                  # TriggerHelpers.ts, Helpers.ts
    package.json                 # Node/credential registration
  workflow/                      # Core interfaces (INodeType, etc.)
  core/nodes-testing/            # NodeTestHarness, test infrastructure
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Node | `PascalCase.node.ts` | `Slack.node.ts` |
| Trigger | `PascalCaseTrigger.node.ts` | `SlackTrigger.node.ts` |
| Credential | `PascalCaseApi.credentials.ts` | `SlackApi.credentials.ts` |
| OAuth2 Credential | `PascalCaseOAuth2Api.credentials.ts` | `SlackOAuth2Api.credentials.ts` |
| Metadata | `PascalCase.node.json` | `Slack.node.json` |
| Icon | `lowercase.svg` | `slack.svg` |
| Test | `PascalCase.node.test.ts` | `Slack.node.test.ts` |

---

## Core Interfaces Quick Reference

### INodeType — The Main Node Interface

Every node implements `INodeType` with ONE execution method:

| Method | Context | Purpose |
|--------|---------|---------|
| `execute()` | `IExecuteFunctions` | Process input items, return output |
| `poll()` | `IPollFunctions` | Periodic data fetch (set `polling: true`) |
| `trigger()` | `ITriggerFunctions` | Listen to external events, `this.emit()` data |
| `webhook()` | `IWebhookFunctions` | Handle incoming HTTP webhooks |

### INodeExecutionData — Data Between Nodes

```typescript
{
  json: IDataObject;            // Main data (required)
  binary?: IBinaryKeyData;      // File attachments
  pairedItem?: { item: number }; // Links output→input (always include)
}

// execute() returns: INodeExecutionData[][] (outer=outputs, inner=items)
return [[
  { json: { id: 1 }, pairedItem: { item: 0 } },
  { json: { id: 2 }, pairedItem: { item: 1 } },
]];
```

### NodeConnectionTypes

```typescript
import { NodeConnectionTypes } from 'n8n-workflow';
NodeConnectionTypes.Main          // Standard data flow
NodeConnectionTypes.AiAgent       // AI connections
NodeConnectionTypes.AiTool
NodeConnectionTypes.AiLanguageModel
// ... AiMemory, AiChain, AiVectorStore, AiEmbedding, etc.
```

### INodeTypeDescription — Key Properties

```typescript
description: INodeTypeDescription = {
  displayName: 'My Service',           // UI display name
  name: 'myService',                    // Internal name (camelCase, unique, immutable)
  icon: 'file:myservice.svg',
  group: ['transform'],                 // 'input' | 'output' | 'transform' | 'trigger'
  version: 1,                           // or [1, 1.1, 2]
  subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
  inputs: [NodeConnectionTypes.Main],
  outputs: [NodeConnectionTypes.Main],
  usableAsTool: true,                   // AI tool compatibility
  polling: true,                        // For polling triggers
  credentials: [{ name: 'myServiceApi', required: true }],
  webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
  requestDefaults: { baseURL: '={{$credentials.baseUrl}}' }, // Declarative nodes
  properties: [ /* ... */ ],
};
```

---

## Parameter Types Quick Reference

| Type | Purpose | Key Options |
|------|---------|-------------|
| `string` | Text input | `typeOptions: { password: true }` |
| `number` | Numeric input | `typeOptions: { minValue, maxValue }` |
| `boolean` | Toggle switch | |
| `options` | Single-select dropdown | `options: [{ name, value }]` |
| `multiOptions` | Multi-select | `options: [{ name, value }]` |
| `collection` | Optional key-value pairs | Used for "Additional Fields" |
| `fixedCollection` | Structured repeating groups | `typeOptions: { multipleValues: true }` |
| `json` | JSON editor | |
| `resourceLocator` | List/ID/URL selector | `modes: [{ name, type, typeOptions }]` |
| `notice` | Read-only info | |
| `hidden` | Hidden value | |

### Display Options (Conditional Visibility)

```typescript
displayOptions: {
  show: {
    resource: ['contact', 'lead'],  // OR within array
    operation: ['create'],          // AND between keys
  },
  hide: { useCustom: [true] },
}
```

### Dynamic Options

```typescript
// loadOptions — simple dropdown
{ type: 'options', typeOptions: { loadOptionsMethod: 'getProjects' } }

// listSearch — searchable with pagination (use with resourceLocator)
modes: [{ typeOptions: { searchListMethod: 'searchUsers', searchable: true } }]
```

---

## Node Registration

After creating a node, register it in `packages/nodes-base/package.json`:

```json
{
  "n8n": {
    "credentials": ["dist/credentials/MyServiceApi.credentials.js"],
    "nodes": ["dist/nodes/MyService/MyService.node.js"]
  }
}
```

### Metadata Categories (.node.json)

Valid: `Analytics`, `Communication`, `Core Nodes`, `Data & Storage`, `Development`, `Finance & Accounting`, `HITL`, `Marketing`, `Miscellaneous`, `Productivity`, `Sales`, `Utility`

---

## Versioning

### Light Versioning — Same class, version array

```typescript
version: [1, 1.1, 1.2],
// Check version: this.getNode().typeVersion
// Conditional display: displayOptions: { show: { '@version': [{ _cnd: { gte: 1.1 } }] } }
```

### Full Versioning — VersionedNodeType

See `templates/nodes/VersionedNode.ts` for the complete pattern with separate V1/V2 classes.

---

## Testing

### Three Testing Approaches

1. **Unit Tests** (`templates/tests/UnitTest.ts`) — Mock `IExecuteFunctions` with `jest-mock-extended`, spy on GenericFunctions. Test each operation individually.

2. **Trigger Tests** (`templates/tests/TriggerTest.ts`) — Use `TriggerHelpers` from `@test/nodes/TriggerHelpers` for standardized webhook, polling, and event trigger testing.

3. **Workflow Integration Tests** (`templates/tests/WorkflowIntegrationTest.ts`) — Use `NodeTestHarness` from `@nodes-testing/node-test-harness` to run full workflow executions with nock HTTP mocking and JSON workflow definitions.

### Running Tests

```bash
pushd packages/nodes-base && pnpm test MyService.node.test && popd
pushd packages/nodes-base && pnpm typecheck && popd
pushd packages/nodes-base && pnpm lint && popd
```

### tsconfig Path Aliases

```typescript
import { ... } from '@credentials/MyService';      // credentials/
import { ... } from '@utils/descriptions';          // utils/
import { ... } from '@test/nodes/Helpers';           // test/
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
```

---

## Debugging Guide

| Problem | Solution |
|---------|----------|
| Node not in panel | Check `package.json` registration + `pnpm build` |
| Credential not available | Verify `name` match in `description.credentials` + `package.json` |
| Parameters missing | Check `displayOptions` conditions match current selections |
| API requests failing | Check `credentials.authenticate` + URL construction in GenericFunctions |
| Binary data not working | Use `this.helpers.prepareBinaryData()`, `assertBinaryData()`, `getBinaryDataBuffer()` |
| Test returns null | Check `credentials` object keys match credential type names + nock URLs |

### Debug Logging

```typescript
this.logger.info('Debug', { data: someValue });
this.logger.error('Error', { error });
console.log('Params:', JSON.stringify(this.getNode().parameters, null, 2));
```

---

## Rules & Anti-Patterns

### TypeScript
- NEVER use `any` — use proper types or `unknown`
- Avoid `as` casting — use type guards
- Define interfaces in `types.ts` for all API responses

### Error Handling
- `NodeOperationError` for user errors (include `{ itemIndex: i }`)
- `NodeApiError` for API errors (wraps HTTP errors with context)
- Always support `continueOnFail()` in the item loop
- Do NOT use `ApplicationError` — it's deprecated

### Execution
- Always include `pairedItem: { item: i }` in output items
- Use `this.helpers.constructExecutionMetaData()` for getAll operations
- Use `this.helpers.returnJsonArray()` to normalize arrays
- Don't send body on GET/DELETE requests

### Parameters
- Set `noDataExpression: true` on resource and operation params
- Include `action` field on operation options (for AI tool descriptions)
- Provide `description` and `placeholder` on all parameters

### Testing
- Mock ALL external dependencies
- Use `nock` for HTTP mocking
- `jest.clearAllMocks()` in beforeEach
- Network is disabled in test env (globalSetup)

### Naming (immutable after release)
- Node `name`: camelCase, unique
- Credential `name`: camelCase, unique
- Icon: `file:lowercase.svg` or `{ light: 'file:X.svg', dark: 'file:X.dark.svg' }`

---

## New Node Checklist

1. [ ] Node file: `nodes/ServiceName/ServiceName.node.ts`
2. [ ] Icon: `nodes/ServiceName/servicename.svg`
3. [ ] Metadata: `nodes/ServiceName/ServiceName.node.json`
4. [ ] Credential: `credentials/ServiceNameApi.credentials.ts`
5. [ ] GenericFunctions: `nodes/ServiceName/GenericFunctions.ts`
6. [ ] Types: `nodes/ServiceName/types.ts`
7. [ ] Registered in `package.json` (both nodes and credentials)
8. [ ] Tests: `nodes/ServiceName/test/ServiceName.node.test.ts`
9. [ ] `pnpm typecheck` passes
10. [ ] `pnpm lint` passes
11. [ ] `pnpm test` passes
