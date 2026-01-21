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

**Key Principles:**

1. **Abstract away internals**: The SDK hides n8n's internal complexity. Users don't deal with connections, connection indices, node IDs, or wire management. They simply chain nodes with `.then()` and the SDK handles the rest.

2. **Code over JSON**: TypeScript code is more natural for LLMs to generate and reason about than raw JSON operations.

3. **Reduce prompt**: T

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

### Type Generation (`pnpm generate-types`)

The `generate-types` script creates TypeScript type definitions from n8n node metadata. Run it after building nodes-base and nodes-langchain:

```bash
pnpm generate-types
```

**What it generates:**

1. **Node Config Types**: Parameter interfaces for each resource/operation combination (e.g., `HttpRequestV43GetConfig`)
2. **Output Types**: TypeScript types from JSON schemas in `__schema__` directories, enabling type-safe access to node output data
3. **Node Types**: Combined types pairing config with output for each node version (e.g., `HttpRequestV43Node`)
4. **Union Types**: `AllNodeTypes` and `KnownNodeType` for type-safe node factories

**Input sources:**
- `packages/nodes-base/dist/types/nodes.json` - Node definitions
- `packages/nodes-base/dist/nodes/{Node}/__schema__/` - Output schemas

**Output:**
- `src/types/generated/index.ts` - Main re-exports and union types
- `src/types/generated/nodes/{package}/{node}/v{version}.ts` - Per-version types

The generated types are committed to the repo for easy tracking and are consumed by the LLM system prompt.

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

### 6. Output schema defined as part of node type
We can now parse __schema__ folders to generate types and use them as part of node definition.
- That means agent is better at setting expressions and manipulating the output data. It's not guessing.
- We can generate pin data for service nodes, removing need for their credentials to get to first manual success.

(Though we can do this for current agent as well)

```typescript
// Import → Edit → Export preserves everything
const wf = workflow.fromJSON(existingJson);
const modified = wf.then(newNode);
const exported = modified.toJSON();  // All original data preserved
```

### 7. Code-First Mental Model

The SDK mirrors simplifies workflows, making it easy for LLMs to understand as TS code:

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

### 10. High-Level Abstractions Hide Complexity

The SDK's high-level concepts eliminate entire categories of problems that the LLM previously struggled with:

**Credentials**: The `newCredential()` helper means the agent never needs to understand credential IDs, storage, or security implications. It simply marks where a credential is needed:

```typescript
config: {
  credentials: { openAiApi: newCredential('OpenAI') }
}
```

The system handles credential creation and secure storage automatically. This eliminates a common failure mode where agents would generate invalid credential references or skip credentials entirely.

**Placeholders**: The `placeholder()` function provides a simple way to mark user-required values without defining a special format or escaping:

```typescript
parameters: {
  apiKey: placeholder('Enter your API key'),
  webhookUrl: placeholder('Your webhook URL')
}
```

No JSON schema, no special markers to remember—just a descriptive hint for the user.

**Typed Contexts**: Functions like `runForAllItems` create typed context objects, so the agent automatically uses correct property names:

```typescript
runForAllItems(async (context) => {
  // context.$input, context.$json, context.$env are all typed
  // Agent can't use wrong property names like $data or $item
  const name = context.$json.name;
  const token = context.$env.API_TOKEN;
})
```

These abstractions turn complex system requirements into simple function calls, reducing errors and improving generation quality.

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

## Learnings

### Working with Claude Opus 4 and Claude Code

**Supervisor + Sub-agent Pattern for Long-Running Tasks**

Claude Opus 4 with Claude Code is powerful, but can take shortcuts on long-running tasks. A better architecture is:
- **Supervisor agent**: Plans and coordinates work
- **Sub-agents**: Execute specific tasks with focused context

This pattern works better for sustained complex work because each sub-agent operates with fresh context and clear objectives.

**AI + Human Expert Guidance**

AI is capable on its own, but works significantly better with expert guidance. Having a human provide:
- Domain expertise about n8n's node structure
- Architectural direction for the SDK design
- Feedback on edge cases and real-world usage
- YOLO mode is awesome (--dangerously-skip-permissions)
- Need to learn to speak the language of the tool. Some Claude keywords: invoke skill, create subagent... "read" leads to different results from "review"
- git workspaces are great for running parallel agents working on the same codebase

...leads to much more effective outcomes than pure AI-driven development.

### Superpowers Plugin

**TDD Skill is Excellent**

The Superpowers TDD (Test-Driven Development) skill is highly effective:
- Forces disciplined red-green-refactor workflow
- Prevents skipping tests "just this once"
- Works well for both short and long-running tasks
- Catches bugs early through failing test verification

**Brainstorming Skill Trade-offs**

The brainstorming skill can be:
- Too slow for quick decisions
- Distracting when you already know the direction
- Better to use Claude's normal planning mode for straightforward tasks

Use brainstorming for genuinely open-ended problems, not for tasks with clear solutions.

### Context Management

**Reduce Confusion, Not Just Tokens**

When managing context for the agent, focus on clarity over compression:
- Split node types by version so parameters don't bleed across versions
- Provide explicit examples rather than relying on inference
- Be specific about what NOT to do (e.g., "don't use $env")
- /compact often. /rewind and /fork as well.

A confused agent with full context performs worse than a clear agent with focused context.

# Next / Todos left
- Fix tests for all real workflows.
- Test more real workflows and LLM generations.
- Fix up memory, conversation history
- Clean up PR. Lots of extra logging at the moment
- Generated type files are generated by a special command in same package. Committed to repo for easy tracking. Need to make sure they are part of image (since they are *.ts).
- Consider issue of downloading all workflows and saving them to repo for testing. Maybe template contributors won't be happy. We might want to obfuscate the details or be more honest and link to them since they are public.
- Make it more clear that SDK api file is for LLM consumption. To avoid other engineers adding unnecessary types to it, confusing the agent.
- Run evaluations.
- Rewrite best practice. Current ones are too specific for this implementation.
- Add type support for $fromAI. Maybe its own helper functions.
- Support/improve/test expr(). Add examples to prompt.
- Add just spacing when adding stickies? Adjust position they are added.
- Better clarify how output data maps to expressions in types and referenced
- AI still generates position unnecessarily. we should remove this and generate these seperately.
- clarify runOnceForAllItems and other code node functions. move to code node type file.
- stickies should accept nodes list

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

