# AI Workflow Builder - Design Document

> **Status**: POC (Proof of Concept)
> **Audience**: Internal engineering team
> **Last Updated**: 2026-01-27

## Purpose

This document captures the architecture, decisions, and roadmap for the AI Workflow Builder system - specifically the **one-shot workflow code agent** and **workflow-sdk** packages. It serves as:

- Knowledge transfer for engineers joining the project
- Decision record explaining architectural choices
- Roadmap for future development

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Workflow SDK Architecture](#2-workflow-sdk-architecture)
3. [One-Shot Agent Architecture](#3-one-shot-agent-architecture)
4. [Challenges](#4-challenges)
5. [Current Features](#5-current-features)
6. [Future Features / Roadmap](#6-future-features--roadmap)
7. [Key Decisions](#7-key-decisions)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     One-Shot Code Agent                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ System Prompt│  │  Tool Loop   │  │ Parse & Validate     │  │
│  │ (v1-sonnet/  │→ │ search_nodes │→ │ parseWorkflowCode()  │  │
│  │  v2-opus)    │  │ get_nodes    │  │ validateWorkflow()   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ TypeScript SDK Code
┌─────────────────────────────────────────────────────────────────┐
│                       Workflow SDK                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Builder API  │  │  Codegen     │  │ Validation           │  │
│  │ workflow()   │  │ JSON → Code  │  │ Graph structure      │  │
│  │ node().to()  │  │ Code → JSON  │  │ Node config          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        WorkflowJSON (n8n native format)
```

The system has two main packages:

- **`@n8n/ai-workflow-builder.ee`**: The one-shot agent that uses an LLM to generate workflows
- **`@n8n/workflow-sdk`**: TypeScript SDK for programmatically building n8n workflows

---

## 2. Workflow SDK Architecture

### Core Design: Graph-First with Fluent Abstractions

The SDK represents workflows as a **directed graph internally**, then provides **fluent abstractions** on top for common patterns. This was a deliberate choice after discovering that purely fluent abstractions (like `.then().then(splitInBatches({true, false}))`) couldn't handle edge cases like the Text Classifier node with dynamic multiple outputs.

### Builder Pattern

```typescript
// Entry points
workflow(id, name, settings?)     // Create workflow builder
node(type, version, config)       // Create regular node
trigger(type, version, config)    // Create trigger node (semantic distinction)

// Chaining
triggerNode.to(nodeA.to(nodeB))   // Linear chain
nodeA.to(nodeB.input(0))          // Explicit input targeting (for Merge)

// Control flow composites
ifNode.onTrue(target).onFalse(target)
switchNode.onCase(0, targetA).onCase(1, targetB)
splitInBatches(config).onDone(final).onEachBatch(loop)
```

### Key Abstractions

| Abstraction | Purpose | Implementation |
|-------------|---------|----------------|
| `NodeInstance` | Single configured node with id, type, params | Tracks connections via `getConnections()` |
| `NodeChain` | Sequence of nodes | Maintains head/tail for type tracking |
| `IfElseBuilder` | IF branching | `.onTrue()` / `.onFalse()` fluent API |
| `SwitchCaseBuilder` | Multi-way routing | `.onCase(index, target)` |
| `SplitInBatchesBuilder` | Loop pattern | `.onDone()` / `.onEachBatch()` with loop-back |
| `InputTarget` | Multi-input nodes | `.input(n)` for Merge inputs |

### AI Subnodes

AI nodes (Agent, Chain) use a **subnodes config** pattern rather than `.to()` chains:

```typescript
node('@n8n/n8n-nodes-langchain.agent', 1.7, {
  parameters: { ... },
  subnodes: {
    model: languageModel('@n8n/n8n-nodes-langchain.lmChatOpenAi', { ... }),
    tools: [tool('@n8n/n8n-nodes-langchain.toolCalculator', { ... })],
    memory: memory('@n8n/n8n-nodes-langchain.memoryBufferWindow', { ... })
  }
})
```

### Round-Trip Conversion

```
WorkflowJSON  ←→  WorkflowBuilder  ←→  TypeScript Code
     ↑                                        ↓
     └────────── parseWorkflowCode() ─────────┘
                 generateWorkflowCode()
```

The codegen pipeline has 4 phases:

1. **Semantic Graph** - Transform index-based connections to semantic names
2. **Graph Annotation** - Detect cycles, convergence points
3. **Composite Tree** - Group nodes into semantic composites
4. **Code Generation** - Emit TypeScript SDK code

---

## 3. One-Shot Agent Architecture

### Why One-Shot Over Multi-Agent

The previous architecture used a **multi-agent approach** with tools for each operation (add node, connect nodes, configure parameters). This was abandoned because:

- **Slower** - Multiple tool calls per node added latency
- **Less accurate** - Node configuration was error-prone across multiple calls
- **Harder to correct** - Partial state made recovery from errors difficult

The one-shot approach generates the **complete workflow in a single code block**, which the LLM can reason about holistically.

### Agent Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. Build Prompt                                            │
│     - System prompt (rules, SDK reference)                  │
│     - Available nodes by category (with discriminators)     │
│     - Current workflow context (if editing)                 │
│     - User message                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Tool Loop (max 25 iterations)                           │
│     ┌─────────────────────────────────────────────────┐     │
│     │  LLM Response                                   │     │
│     │    ├─ Tool calls? → Execute → Add to messages   │     │
│     │    └─ No tools? → Try parse as final output     │     │
│     └─────────────────────────────────────────────────┘     │
│                              ↓                              │
│     Tools available:                                        │
│     - search_nodes: Find nodes by name/description          │
│     - get_nodes: Get TypeScript type definitions            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Parse & Validate                                        │
│     - parseWorkflowCodeToBuilder(code)                      │
│     - builder.validate() → Graph structure errors           │
│     - validateWorkflow(json) → Node config errors           │
│                              ↓                              │
│     On error/warning → Send back to LLM for correction      │
│     (max 3 consecutive parse errors before failing)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                        WorkflowJSON + Stats
```

### Node Discovery Tools

**search_nodes**: Searches by name/description, returns discriminator info

```
Input:  { queries: ["salesforce", "http"] }
Output: Node IDs with resource/operation or mode discriminators
        Shows how to call get_nodes with required params
```

**get_nodes**: Returns full TypeScript type definitions

```
Input:  { nodeIds: [
           "n8n-nodes-base.aggregate",  // simple
           { nodeId: "n8n-nodes-base.freshservice",
             resource: "ticket", operation: "get" }  // with discriminators
         ]}
Output: Complete TS types for node parameters, credentials
```

### Discriminator Pattern

Many nodes have **split type files** based on resource/operation or mode:

```
nodes/n8n-nodes-base/freshservice/
  v1/
    resource_ticket/
      operation_get.ts
      operation_create.ts
    resource_contact/
      operation_get.ts

nodes/n8n-nodes-base/code/
  v2/
    mode_run_once_for_all_items.ts
    mode_run_once_for_each_item.ts
```

The agent must discover these via `search_nodes` and provide discriminators to `get_nodes`.

### Prompt Versions

| Version | Model | Approach |
|---------|-------|----------|
| v1-sonnet | Sonnet 4.5, Haiku | Condensed prompt, no SDK reference |
| v2-opus | Opus 4.5 | Full SDK reference (not yet optimized) |

Plan: Optimize v1-sonnet first, then use Anthropic's optimizer tool for v2-opus.

---

## 4. Challenges

### 4.1 Representing Workflows for LLMs

**Problem**: n8n workflows are directed graphs, but LLMs work best with linear text. The graph nature creates challenges:

- Multiple branches diverging and converging
- Loops (SplitInBatches looping back)
- Multiple inputs to single node (Merge)
- Implicit vs explicit connections

**Current approach**: TypeScript SDK with fluent API that reads linearly but represents graph structure. The codegen pipeline reconstructs semantic intent from raw connections.

**Tension**: Simpler abstractions (hiding graph complexity) vs accuracy (representing all edge cases).

### 4.2 Dynamic Connections/Subnodes Based on Parameters

**Problem**: Some nodes have connections or subnodes that vary based on parameter values:

- **Text Classifier**: Number of outputs depends on configured categories
- **AI nodes**: Which subnodes are valid depends on agent type/mode
- **Switch**: Output count is dynamic

**Current approach**: Partially handled via discriminators and `builderHint.inputs` for mode-aware subnode configuration. Not fully solved.

### 4.3 Security: `parseWorkflowCode` Uses `Function()`

**Problem**: The code parsing uses JavaScript's `Function()` constructor (essentially `eval`), which has security implications:

```typescript
// Current implementation
const fn = new Function('workflow', 'node', 'trigger', ...args, code);
return fn(workflow, node, trigger, ...);
```

**Options**:

- **Custom parser**: Build AST-based parser that doesn't execute code
- **Task runners**: Execute in sandboxed environment (n8n's task runner infrastructure)

**Status**: Known risk, needs resolution before production.

### 4.4 Template Storage for Round-Trip Tests

**Problem**: Testing round-trip conversion (JSON → Code → JSON) requires workflow templates. Committing many JSON files clutters the repo and creates noise for contributors.

**Potential solution**: Store templates as compressed archives (zip) that are extracted during test runs.

### 4.5 Token Efficiency

**Problem**: The SDK API reference and node documentation are large. Including everything in the prompt is expensive and may exceed context limits.

**Current approach**:

- Different prompt versions for different models (Sonnet gets condensed, Opus gets full)
- Node list is truncated (top 20 triggers, 30 AI nodes, 50 integrations)
- Full node types fetched on-demand via `get_nodes` tool

### 4.6 LLM Generates Unnecessary Positions

**Problem**: The agent generates `position: [x, y]` for each node, but these should be calculated programmatically based on graph structure.

**Impact**: Wasted tokens, inconsistent layouts, positions don't adapt to edits.

**Planned fix**: Remove position from LLM generation, calculate post-hoc.

---

## 5. Current Features

### Workflow SDK

| Feature | Status | Notes |
|---------|--------|-------|
| Fluent builder API | Working | `workflow()`, `node()`, `trigger()`, `.to()` |
| Round-trip conversion | Working | JSON <-> Code <-> Builder with high fidelity |
| IF/Else branching | Working | `.onTrue()` / `.onFalse()` |
| Switch routing | Working | `.onCase(index, target)` |
| SplitInBatches loops | Working | `.onDone()` / `.onEachBatch()` with loop-back |
| Merge node | Tricky | Works via `.input(n)` but needs simpler abstraction |
| AI subnode config | Working | `subnodes: { model, tools, memory }` |
| Graph validation | Working | Detects orphaned nodes, invalid connections, cycles |
| Codegen pipeline | Working | 4-phase semantic transformation |
| Expression support | Working | `={{ $json.field }}` format |
| Placeholders | Working | `placeholder('description')` for user input |
| Credentials | Working | `newCredential('Name')` marker |

### One-Shot Agent

| Feature | Status | Notes |
|---------|--------|-------|
| Node search tool | Working | Multi-query, returns discriminator info |
| Node get tool | Working | Returns TS type definitions, handles split files |
| Self-correction loop | Working | Retries on parse errors (max 3) |
| Validation feedback | Working | Sends warnings back to LLM for correction |
| Streaming output | Working | Tool progress, messages, workflow updates |
| Token tracking | Working | Input/output tokens, cost estimation |
| Prompt versioning | Working | v1-sonnet implemented, v2-opus scaffolded |
| Current workflow context | Working | Can edit existing workflows |

### Evaluation

| Feature | Status | Notes |
|---------|--------|-------|
| Eval dataset | Working | Structured test cases |
| Pairwise comparison | Working | Compare models/prompts |
| Code typecheck eval | Not working well | Needs investigation |
| LLM judge eval | Not working well | Needs investigation |

---

## 6. Future Features / Roadmap

### SDK Improvements

| Feature | Description | Priority |
|---------|-------------|----------|
| Named branches | `onCase('approved')` instead of `onCase(0)` for Switch/Text Classifier/IF | High |
| Simpler merge abstraction | More intuitive API than `.input(n)` | Medium |
| `expr()` with type narrowing | Generate code instead of strings, with context-aware types | Medium |
| Code node helpers | `runOnceForAllItems()`, `runOnceForEachItem()` moved to code node type file | Medium |
| RLC support | Resource Locator Component for dynamic resource selection | Low |

### Agent Improvements

| Feature | Description | Priority |
|---------|-------------|----------|
| Remove position generation | Calculate positions programmatically post-generation | High |
| Templates as examples | Include workflow templates in prompt for few-shot learning | Medium |
| Text editing tools | Tools for iterative refinement of generated workflows | Medium |
| Opus prompt optimization | Use Anthropic's optimizer tool after Sonnet is stable | Low |

### Infrastructure

| Feature | Description | Priority |
|---------|-------------|----------|
| Secure code parsing | Replace `Function()` with custom parser or task runners | High |
| Pin data generation | Use random generator instead of AI-generated test data | Medium |
| Template storage | Zip archives for round-trip test templates | Low |

### Evaluation

| Feature | Description | Priority |
|---------|-------------|----------|
| Fix code-typecheck eval | Debug and stabilize TypeScript type checking evaluation | High |
| Fix LLM judge eval | Debug and stabilize LLM-based quality evaluation | Medium |

---

## 7. Key Decisions

### Decision 1: One-Shot Code Generation vs Multi-Agent Tool Calling

**Context**: Initial architecture used multiple agents with tools for each operation (add node, connect nodes, configure parameters).

**Decision**: Switch to one-shot code generation where LLM outputs complete TypeScript SDK code.

**Rationale**:

- Multi-agent was slower (multiple round trips per node)
- Configuration accuracy suffered across tool boundaries
- Partial state made error recovery difficult
- LLM can reason holistically about complete workflow code

**Trade-off**: Less granular control, but significantly better accuracy and speed.

---

### Decision 2: TypeScript SDK vs Direct JSON Generation

**Context**: Could have LLM generate n8n's native WorkflowJSON directly.

**Decision**: Create intermediate TypeScript SDK representation.

**Rationale**:

- TypeScript is more natural for LLMs (trained on code)
- Fluent API is more readable than nested JSON
- Type definitions provide self-documenting API
- Round-trip conversion enables validation before JSON output
- SDK can enforce constraints that JSON cannot

**Trade-off**: Additional parsing step, but better LLM comprehension and validation.

---

### Decision 3: Graph-First Internal Model with Fluent Abstractions

**Context**: Tried purely fluent abstractions like `.then().then(splitInBatches({true, false}))` and `merge({input0, input1})`.

**Decision**: Represent as graph internally, add fluent abstractions on top.

**Rationale**:

- Edge cases like Text Classifier (dynamic outputs) broke pure fluent model
- Graph model handles arbitrary topologies
- Abstractions (SplitInBatches, IfElse) are sugar over graph operations
- Codegen can reconstruct semantic intent from graph

**Trade-off**: More complex internals, but handles all n8n patterns.

---

### Decision 4: Split Type Files with Discriminators

**Context**: Large nodes (Salesforce, Freshservice) have hundreds of parameter combinations based on resource/operation.

**Decision**: Generate split type files per resource/operation or mode, require discriminators in `get_nodes`.

**Rationale**:

- Single file would be too large for context
- LLM only needs types for specific operation being used
- Discriminator pattern matches n8n's UI behavior
- Search tool surfaces available discriminators

**Trade-off**: More complex tool API, but manageable context size.

---

### Decision 5: Embedded SDK Documentation

**Context**: Agent needs SDK API reference to generate correct code.

**Decision**: Embed SDK_API_CONTENT at build time rather than reading from disk.

**Rationale**:

- Avoids disk I/O during request handling
- Ensures consistency between code and docs
- Content can be optimized/minified for different prompt versions

**Trade-off**: Build step complexity, but better runtime performance.

---

## Appendix: File Locations

### Workflow SDK (`packages/@n8n/workflow-sdk/`)

| Path | Purpose |
|------|---------|
| `src/index.ts` | Public API exports |
| `src/workflow-builder.ts` | WorkflowBuilder implementation |
| `src/node-builder.ts` | Node/Trigger/Chain builders |
| `src/split-in-batches.ts` | SplitInBatches composite |
| `src/if-else.ts`, `src/switch-case.ts` | Control flow composites |
| `src/merge.ts` | Merge composite |
| `src/subnode-builders.ts` | AI subnode factories |
| `src/codegen/` | JSON -> Code pipeline |
| `src/validation/` | Workflow validation |
| `src/parse-workflow-code.ts` | Code -> Builder parsing |

### One-Shot Agent (`packages/@n8n/ai-workflow-builder.ee/`)

| Path | Purpose |
|------|---------|
| `src/one-shot-workflow-code-agent.ts` | Main agent implementation |
| `src/prompts/one-shot/` | Prompt versions (v1-sonnet, v2-opus) |
| `src/tools/one-shot-node-search.tool.ts` | Node search tool |
| `src/tools/one-shot-node-get.tool.ts` | Node get tool |
| `src/evaluators/` | Evaluation implementations |
