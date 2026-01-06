# AI Workflow Builder Prompts

Centralized prompts for the n8n AI Workflow Builder. This directory contains all prompts used by agents and chains.

## Directory Structure

```
src/prompts/
├── index.ts                      # Central exports
├── README.md                     # This file
├── legacy-agent.prompt.ts        # Single-agent mode prompt
│
├── builder/                      # PromptBuilder utility
│   ├── prompt-builder.ts         # Fluent builder class
│   └── types.ts                  # Type definitions
│
├── agents/                       # Multi-agent system prompts
│   ├── supervisor.prompt.ts      # Routes requests to specialists
│   ├── discovery.prompt.ts       # Finds nodes & categorizes techniques
│   ├── builder.prompt.ts         # Creates workflow structure
│   ├── configurator.prompt.ts    # Sets node parameters
│   └── responder.prompt.ts       # Generates user responses
│
└── chains/                       # Chain-level prompts
    ├── categorization.prompt.ts  # Workflow technique classification
    ├── compact.prompt.ts         # Conversation summarization
    ├── workflow-name.prompt.ts   # Workflow name generation
    │
    └── parameter-updater/        # Dynamic prompt system for node updates
        ├── registry.ts           # Pattern-matching registry
        ├── types.ts              # Type definitions
        ├── parameter-updater.prompt.ts  # Base prompts
        ├── guides/               # Node & parameter guides
        └── examples/             # Few-shot examples
```

## PromptBuilder Utility

A type-safe, fluent builder for composing LLM prompts with conditional sections.

### Basic Usage

```typescript
const systemPrompt = prompt()
  .section('role', 'You are an assistant')
  .sectionIf(hasContext, 'context', () => buildContext())
  .examples('examples', data, (ex) => `${ex.input} → ${ex.output}`)
  .build();
```

### Key Features

- **Fluent API**: Chain methods for readable prompt composition
- **Conditional sections**: `sectionIf()` and `examplesIf()` for dynamic content
- **Lazy evaluation**: Factory functions evaluated only at build time
- **Output formats**: XML tags (default) or Markdown headers
- **LangChain integration**: `buildAsMessageBlocks()` with cache_control support

## Multi-Agent Prompts

The `agents/` directory contains prompts for the multi-agent workflow builder system. Each agent has a specialized role:

| Agent | Purpose |
|-------|---------|
| **Supervisor** | Routes user requests to the appropriate specialist |
| **Discovery** | Identifies relevant n8n nodes and categorizes techniques |
| **Builder** | Creates workflow structure (nodes and connections) |
| **Configurator** | Sets node parameters using natural language |
| **Responder** | Generates user-facing responses |

All agent prompts use PromptBuilder for consistent composition.

## Chain Prompts

The `chains/` directory contains prompts for specific LLM chain operations:

| Chain | Purpose |
|-------|---------|
| **Categorization** | Analyzes user prompts to identify workflow techniques |
| **Compact** | Summarizes conversations for context management |
| **Workflow Name** | Generates descriptive workflow names |
| **Parameter Updater** | Builds context-aware prompts for node parameter updates |

## Parameter Updater System

A registry-based system that automatically selects relevant guides and examples based on node type patterns.

### How It Works

1. **Pattern Matching**: Guides and examples declare patterns they match against
2. **Context-Based Selection**: Registry filters content based on node type and conditions
3. **Dynamic Assembly**: PromptBuilder combines base prompts with matched content

### Pattern Types

| Pattern | Example | Matches |
|---------|---------|---------|
| Exact match | `n8n-nodes-base.set` | Only that specific node |
| Suffix wildcard | `*Tool` | `gmailTool`, `slackTool`, etc. |
| Prefix wildcard | `n8n-nodes-base.*` | Any n8n-nodes-base node |
| Substring | `.set` | Any node containing `.set` |

### Adding a New Guide

1. Create a file in `guides/` with the guide content and patterns
2. Export from `guides/index.ts`
3. Add to the registry array in `registry.ts`

Example guide structure:

```typescript
export const MY_NODE_GUIDE: NodeTypeGuide = {
  patterns: ['n8n-nodes-base.myNode'],  // Which nodes to match
  condition: (ctx) => true,              // Optional: extra conditions
  content: `Your guide content here...`,
};
```

### Conditional Guides

Some guides only apply in certain contexts. Use the `condition` property:

```typescript
export const RESOURCE_LOCATOR_GUIDE: NodeTypeGuide = {
  patterns: ['*'],  // Matches all nodes
  condition: (ctx) => ctx.hasResourceLocatorParams === true,
  content: `...`,
};
```

### Current Guides

| Guide | Pattern | Purpose |
|-------|---------|---------|
| Set Node | `n8n-nodes-base.set` | Assignment structure & types |
| IF Node | `n8n-nodes-base.if` | Filter conditions & operators |
| Switch Node | `n8n-nodes-base.switch` | Rules and routing |
| HTTP Request | `n8n-nodes-base.httpRequest` | URL, headers, body, auth |
| Tool Nodes | `*Tool` | $fromAI expressions |
| Resource Locator | `*` (conditional) | __rl structure & modes |
| System Message | `*` (conditional) | AI node message separation |
| Text Fields | `*` (conditional) | Expression embedding |

### Current Examples

| Examples | Pattern | Purpose |
|----------|---------|---------|
| Set Node | `n8n-nodes-base.set` | Set node examples |
| IF Node | `n8n-nodes-base.if` | IF node examples |
| Switch Node | `n8n-nodes-base.switch` | Switch node examples |
| Tool Nodes | `*Tool` | Tool node examples |
| Resource Locator | `*` (conditional) | ResourceLocator examples |
| Simple Updates | `*` | Generic fallback examples |
