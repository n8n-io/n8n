# One-Shot Workflow Code Agent Design

This document explains the design of the new **One-Shot Workflow Code Agent** and the **Workflow SDK**, comparing it against the previous multi-agent architecture.

## Overview

The One-Shot Workflow Code Agent represents a fundamental shift in how the AI workflow builder generates n8n workflows. Instead of using multiple specialized agents that iteratively build workflows through JSON operations, the new approach generates complete workflows in a single pass using TypeScript SDK code.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Old Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│  User Request                                                   │
│       ↓                                                         │
│  Supervisor → Discovery → Builder → Configurator → Responder   │
│       ↑──────────────────────────────────────────────┘         │
│  (Multiple iterations, JSON operations, complex state)          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    New Architecture                             │
├─────────────────────────────────────────────────────────────────┤
│  User Request                                                   │
│       ↓                                                         │
│  One-Shot Agent (with tools) → TypeScript Code → Parse → JSON  │
│  (Single generation pass, code-based output)                    │
└─────────────────────────────────────────────────────────────────┘
```

## The Old Multi-Agent Architecture

### Components

The previous system used a **supervisor pattern** with specialized agents:

| Agent | Responsibility |
|-------|---------------|
| **Supervisor** | Routes requests to appropriate specialist |
| **Discovery** | Searches and identifies relevant n8n nodes |
| **Builder** | Creates workflow structure (nodes, connections) |
| **Configurator** | Configures node parameters |
| **Responder** | Synthesizes user-facing responses |

### Flow

1. User sends a request
2. Supervisor analyzes and routes to Discovery
3. Discovery finds relevant nodes → routes to Builder
4. Builder adds nodes/connections via JSON operations → routes to Configurator
5. Configurator sets parameters → may route back to Builder
6. Eventually routes to Responder
7. Responder generates user message

### Challenges

- **Complex state management**: ParentGraphState with messages, coordinationLog, discoveryContext, workflowJSON, etc.
- **Multiple LLM calls**: Each agent invokes the LLM, often multiple times per request
- **Iteration limits**: Required MAX_DISCOVERY_ITERATIONS, MAX_BUILDER_ITERATIONS, MAX_CONFIGURATOR_ITERATIONS
- **JSON manipulation**: Agents output workflow operations that get processed into JSON
- **Error propagation**: Errors in any subgraph need careful handling and routing
- **Token/cost intensive**: Up to 50+ LLM calls for complex workflows

## The New One-Shot Code Agent

### Design Philosophy

Instead of iteratively building JSON, the LLM generates complete TypeScript code using the Workflow SDK. This code is then parsed into JSON for the frontend.

```typescript
// LLM generates code like this:
return workflow('my-workflow', 'My Workflow')
  .add(trigger({
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: { name: 'Start' }
  }))
  .then(node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {
      name: 'Fetch Data',
      parameters: { url: 'https://api.example.com' }
    }
  }));
```

### Components

**1. OneShotWorkflowCodeAgent** (`one-shot-workflow-code-agent.ts`)
- Main agent class
- Implements agentic loop for tool calls
- Uses `parseWorkflowCode()` and `validateWorkflow()` from workflow-sdk

**2. Node Discovery Tools**
- `search_node`: Searches available nodes by keyword
- `get_nodes`: Retrieves full type definitions for specific nodes

**3. Workflow SDK** (`@n8n/workflow-sdk`)
- TypeScript DSL for building workflows
- Immutable builder pattern
- Compiles to n8n JSON format

### Flow

1. User sends request
2. Agent receives SDK type definitions in system prompt
3. Agent calls `get_nodes` tool to get exact node specifications
4. Agent generates complete TypeScript SDK code
5. Code is parsed to WorkflowJSON via `parseWorkflowCode()`
6. Workflow is validated via `validateWorkflow()`
7. Result streamed to frontend

### Agentic Loop

The one-shot agent still uses an agentic loop, but only for **tool discovery**:

```
┌──────────────────────────────────────────────────────┐
│ while (iteration < MAX_ITERATIONS):                  │
│   1. Invoke LLM                                      │
│   2. If tool_calls → execute tools → continue        │
│   3. If no tool_calls → parse structured output      │
│      - If valid JSON with workflowCode → done        │
│      - If invalid → prompt for correction            │
└──────────────────────────────────────────────────────┘
```

## The Workflow SDK

### Core Concepts

**Immutable Builder Pattern**
```typescript
// Every method returns a new instance
const wf1 = workflow('id', 'name');
const wf2 = wf1.add(trigger(...));  // wf1 unchanged
const wf3 = wf2.then(node(...));    // wf2 unchanged
```

**Factory Functions**
```typescript
workflow(id, name, settings?)    // Create workflow
trigger(input)                   // Create trigger node
node(input)                      // Create regular node
sticky(content, config?)         // Create sticky note
placeholder(hint)                // Mark values for user input
newCredential(name)              // Mark credential for creation
```

**Composite Patterns**
```typescript
merge([branch1, branch2])        // Parallel execution
ifBranch([true, false], config)  // Conditional branching
switchCase([case1, case2], cfg)  // Multi-way routing
splitInBatches()                 // Batch processing
```

**AI/LangChain Subnodes**
```typescript
node({
  type: '@n8n/n8n-nodes-langchain.agent',
  config: {
    subnodes: {
      model: node({ type: '...lmChatOpenAi' }),
      tools: [node({ type: '...toolCalculator' })],
      memory: node({ type: '...memoryBufferWindow' })
    }
  }
})
```

### Code Generation & Parsing

**Forward Direction**: SDK Code → JSON
```typescript
const code = `
  return workflow('id', 'name')
    .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1.1 }))
    .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.3 }));
`;

const json = parseWorkflowCode(code);
// Returns: { id, name, nodes: [...], connections: {...} }
```

**Reverse Direction**: JSON → SDK Code
```typescript
const json = { id: 'wf', name: 'My Workflow', nodes: [...], connections: {...} };
const code = generateWorkflowCode(json);
// Returns TypeScript SDK code string
```

### Type Safety

The SDK provides generated TypeScript types for all nodes:

```typescript
// Generated types ensure correct parameters
node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    parameters: {
      method: 'GET',        // TypeScript knows valid methods
      url: string,          // Required parameter
      authentication: '...' // Optional with valid values
    }
  }
})
```

## Advantages of the New Approach

### 1. Reduced LLM Calls

| Metric | Old Architecture | New Architecture |
|--------|------------------|------------------|
| LLM calls per simple workflow | 5-15 | 2-3 |
| LLM calls per complex workflow | 20-50+ | 3-8 |
| Cost reduction | - | ~70-80% |

### 2. Structural Correctness by Design

The SDK's builder pattern makes it impossible to create structurally invalid workflows:

```typescript
// SDK enforces:
// - Workflows must have at least one trigger
// - Nodes connected via .then() are automatically wired
// - AI subnodes go in the subnodes config, not main chain
```

### 3. Simplified State Management

| Old State | New State |
|-----------|-----------|
| messages, workflowJSON, workflowOperations, coordinationLog, discoveryContext, previousSummary, nextPhase, errorState, validationErrors, configurationNeeds | messages only |

### 4. Deterministic Parsing

Instead of hoping the LLM produces valid JSON operations:

```typescript
// Old: LLM outputs operations that get applied
{ operation: 'addNode', nodeType: '...', ... }  // Might fail

// New: LLM outputs code that gets parsed
parseWorkflowCode(code)  // Deterministic, type-safe
```

### 5. Better Error Recovery

```typescript
// Validation happens after generation
const workflow = parseWorkflowCode(code);
const result = validateWorkflow(workflow);

if (!result.valid) {
  // Clear errors with locations
  // Can retry with specific feedback
}
```

### 6. Round-Trip Fidelity

```typescript
// Import → Edit → Export preserves everything
const wf = workflow.fromJSON(existingJson);
const modified = wf.then(newNode);
const exported = modified.toJSON();  // All original data preserved
```

### 7. Code-First Mental Model

The SDK mirrors how developers think about workflows:

```typescript
// Natural reading order: trigger → process → output
workflow('id', 'name')
  .add(trigger(...))      // "Start here"
  .then(fetchData)        // "Then fetch"
  .then(transform)        // "Then transform"
  .then(saveResult);      // "Then save"
```

### 8. Composability

Complex patterns are first-class citizens:

```typescript
// Parallel branches with merge
.then(merge([
  fetchFromAPI1,
  fetchFromAPI2,
  fetchFromAPI3
]))
.then(combineResults)

// Conditional execution
.then(ifBranch([
  handleSuccess,
  handleFailure
], { name: 'Check Status' }))
```

### 9. Testability

Workflows can be constructed and tested in isolation:

```typescript
// Unit test a workflow segment
const segment = node({ ... }).then(node({ ... }));
const wf = workflow('test', 'Test').add(trigger(...)).add(segment);
expect(wf.toJSON().nodes).toHaveLength(3);
```

## System Prompt Design

The one-shot agent's system prompt includes:

1. **SDK API Reference**: The actual TypeScript types from `workflow-sdk/src/types/base.ts`
2. **Available Nodes**: Categorized list of node IDs
3. **Workflow Rules**: Best practices (triggers first, no orphans, naming conventions)
4. **AI Patterns**: Examples for AI agent configuration
5. **Complete Examples**: Full workflow code samples
6. **Mandatory Workflow**: Forces the LLM to call `get_nodes` before generating

This creates a **comprehensive reference** that enables single-pass generation.

## Configuration Comparison

### Old Multi-Agent Config

```typescript
interface StageLLMs {
  supervisor: BaseChatModel;
  responder: BaseChatModel;
  discovery: BaseChatModel;
  builder: BaseChatModel;
  configurator: BaseChatModel;
  parameterUpdater: BaseChatModel;
}
```

### New One-Shot Config

```typescript
interface OneShotWorkflowCodeAgentConfig {
  llm: BaseChatModel;         // Single LLM
  nodeTypes: INodeTypeDescription[];
  logger?: Logger;
}
```

## Migration Path

The current implementation supports both architectures via feature flag:

```typescript
const useOneShotAgent = payload.featureFlags?.oneShotAgent ?? true;

if (useOneShotAgent) {
  yield* oneShotAgent.chat(...);
} else {
  yield* multiAgentSystem.chat(...);
}
```

## Summary

The One-Shot Workflow Code Agent with Workflow SDK represents a significant improvement:

| Aspect | Old | New |
|--------|-----|-----|
| Architecture | Multi-agent with supervisor | Single agent with tools |
| Output format | JSON operations | TypeScript code |
| LLM calls | 5-50+ | 2-8 |
| State complexity | High (6+ state fields) | Low (messages only) |
| Error handling | Subgraph-level | Parse-time validation |
| Type safety | Manual validation | TypeScript types |
| Composability | Limited | First-class patterns |

The SDK-based approach leverages the LLM's strength in code generation while providing deterministic parsing and validation, resulting in faster, more reliable, and more cost-effective workflow generation.
