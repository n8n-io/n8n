# AI Workflow Builder Prompts

Centralized prompts for the n8n AI Workflow Builder. This directory contains all prompts used by agents and chains.

**This guide is designed for both AI agents and non-engineers** - prompt changes are text changes, so you can edit them directly.

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Multi-Agent Prompts](#multi-agent-prompts)
4. [Legacy Agent Prompt](#legacy-agent-prompt)
5. [Chain Prompts](#chain-prompts)
6. [Parameter Updater System](#parameter-updater-system)
7. [What Goes Where](#what-goes-where)
8. [Editing Guidelines](#editing-guidelines)
9. [Quick Reference](#quick-reference)

---

## Overview

The AI Workflow Builder uses a **multi-agent supervisor architecture** with specialized agents. Each agent has its own prompt file containing instructions for a specific part of the workflow building process.

### Architecture

The system uses a **multi-agent supervisor architecture** with specialized agents:

- **Supervisor Agent**: Routes requests to the right specialist
- **Discovery Agent**: Finds relevant n8n nodes
- **Builder Agent**: Creates workflow structure (nodes and connections)
- **Configurator Agent**: Sets node parameters
- **Responder Agent**: Synthesizes user-facing responses

---

## Directory Structure

```
src/prompts/
├── index.ts                      # Central exports
├── README.md                     # This file
├── legacy-agent.prompt.ts        # Single-agent mode (~650 lines)
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
    └── parameter-updater/        # Dynamic prompt building for node updates
        ├── index.ts              # Exports
        ├── prompt-builder.ts     # ParameterUpdatePromptBuilder class
        ├── prompt-config.ts      # Node detection config
        ├── instance-url.ts       # Instance URL template
        ├── base/                 # Core instructions
        ├── node-types/           # Node-specific guides
        ├── parameter-types/      # Parameter-specific guides
        └── examples/             # Few-shot examples
```

## Multi-Agent Prompts

### Supervisor (`agents/supervisor.prompt.ts`)

Routes user requests to the appropriate specialist agent.

| Export | Description |
|--------|-------------|
| `buildSupervisorPrompt()` | Builds the supervisor system prompt |
| `SUPERVISOR_PROMPT_SUFFIX` | Suffix asking "which agent should act next?" |

**Routing targets:** discovery, builder, configurator, responder

**Key Sections:**
- `AVAILABLE_AGENTS` - List of agents and their roles
- `ROUTING_DECISION_TREE` - Decision logic for routing
- `KEY_DISTINCTION` - Replacement vs Configuration clarification

**When to Edit:**
- Routing logic changes
- Agent role definitions
- When to route to which agent
- Adding new routing scenarios

### Discovery (`agents/discovery.prompt.ts`)

Identifies relevant n8n nodes and categorizes workflow techniques.

| Export | Description |
|--------|-------------|
| `buildDiscoveryPrompt(options)` | Builds prompt with optional examples phase |
| `formatTechniqueList()` | Formats available techniques as bullet list |
| `formatExampleCategorizations()` | Formats few-shot examples |
| `exampleCategorizations` | 14 few-shot classification examples |
| `DiscoveryPromptOptions` | Type: `{ includeExamples: boolean }` |

**Input variables:** `{techniques}`, `{exampleCategorizations}`

**Key Sections:**
- Technique categorization examples
- Available tools (get_best_practices, search_nodes, get_node_details)
- Process steps (categorize → search → get details → submit)
- Connection-changing parameters identification rules
- Technique clarifications (NOTIFICATION vs CHATBOT, etc.)

**When to Edit:**
- How nodes are discovered
- Technique categorization logic
- Connection-changing parameter identification
- Best practices retrieval process
- Adding new technique examples

### Builder (`agents/builder.prompt.ts`)

Constructs workflow structure by creating nodes and connections.

| Export | Description |
|--------|-------------|
| `buildBuilderPrompt()` | Builds the builder system prompt |

**Key Sections:**
- Node creation rules
- Connection parameters
- AI connections
- RAG workflow patterns
- Workflow Configuration node placement
- Data parsing strategy
- Proactive design guidelines
- Connection type examples (main, ai_languageModel, ai_tool, etc.)

**When to Edit:**
- Node creation rules
- Connection patterns
- Workflow structure requirements
- RAG workflow specific instructions
- AI node connection rules
- Default value warnings

### Configurator (`agents/configurator.prompt.ts`)

Sets up node parameters using natural language instructions.

| Export | Description |
|--------|-------------|
| `buildConfiguratorPrompt()` | Builds the configurator system prompt |
| `INSTANCE_URL_PROMPT` | Template with `{instanceUrl}` variable |

**Input variables:** `{instanceUrl}`

**Key Sections:**
- Configuration process steps
- Workflow JSON detection
- Parameter configuration rules
- Special expressions for tool nodes (`$fromAI` syntax)
- Critical parameters to always set
- Default value warnings
- Response format

**When to Edit:**
- Parameter configuration rules
- Tool node `$fromAI` expression usage
- Required parameters list
- Default value warnings
- Instance URL handling

### Responder (`agents/responder.prompt.ts`)

Generates user-facing responses and handles conversational queries.

| Export | Description |
|--------|-------------|
| `buildResponderPrompt()` | Builds the responder system prompt |

**Key Sections:**
- Workflow completion responses
- Questions/conversations handling
- Response style guidelines

**When to Edit:**
- Response formatting
- User communication style
- How to present workflow information
- Progress update rules

## Legacy Agent Prompt

### `legacy-agent.prompt.ts`

Comprehensive monolithic prompt for single-agent mode. Contains all workflow building logic.

| Export | Description |
|--------|-------------|
| `createMainAgentPrompt(options?)` | Creates ChatPromptTemplate with options |
| `mainAgentPrompt` | Default prompt instance |
| `MainAgentPromptOptions` | Type: `{ includeExamplesPhase?: boolean }` |

**Input variables:** `{instanceUrl}`, `{previousSummary}`, `{messages}`

**Phases:**
1. Categorization (mandatory)
2. Examples (optional, feature-flagged)
3. Discovery (parallel)
4. Analysis (parallel)
5. Creation (parallel)
6. Connection (parallel)
7. Configuration (mandatory)
8. Validation (mandatory)

## Chain Prompts

### Categorization (`chains/categorization.prompt.ts`)

Analyzes user prompts to identify workflow techniques.

| Export | Description |
|--------|-------------|
| `promptCategorizationTemplate` | PromptTemplate for classification |
| `examplePrompts` | 5 few-shot examples |
| `formatExamplePrompts()` | Formats examples as "prompt → techniques" |
| `formatTechniqueList()` | Formats technique descriptions |

**Input variables:** `{userPrompt}`, `{techniques}`

### Compact (`chains/compact.prompt.ts`)

Summarizes multi-turn conversations for context management.

| Export | Description |
|--------|-------------|
| `compactPromptTemplate` | PromptTemplate for summarization |

**Input variables:** `{previousSummary}`, `{conversationText}`

**Output:** Structured summary with key_decisions, current_state, next_steps

### Workflow Name (`chains/workflow-name.prompt.ts`)

Generates descriptive workflow names.

| Export | Description |
|--------|-------------|
| `workflowNamingPromptTemplate` | PromptTemplate for naming |

**Input variables:** `{initialPrompt}`

## Parameter Updater System

A modular system for building context-aware prompts for node parameter updates.

### ParameterUpdatePromptBuilder (`chains/parameter-updater/prompt-builder.ts`)

Dynamically assembles prompts based on node context.

```typescript
import { ParameterUpdatePromptBuilder } from '@/prompts';

const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
  nodeType: 'n8n-nodes-base.set',
  nodeDefinition: nodeTypeDescription,
  requestedChanges: ['set name to John'],
  hasResourceLocatorParams: false,
});
```

**Build logic:**
1. Always: CORE_INSTRUCTIONS + EXPRESSION_RULES
2. Node-type guide (Set, IF, Switch, HTTP, Tool)
3. Parameter-type guides if applicable
4. COMMON_PATTERNS
5. Relevant examples
6. OUTPUT_FORMAT

### Base Prompts (`chains/parameter-updater/base/`)

| File | Export | Description |
|------|--------|-------------|
| `core-instructions.ts` | `CORE_INSTRUCTIONS` | Parameter update guidelines |
| `expression-rules.ts` | `EXPRESSION_RULES` | n8n expression syntax rules |
| `common-patterns.ts` | `COMMON_PATTERNS` | HTTP Request patterns |
| `output-format.ts` | `OUTPUT_FORMAT` | Expected output structure |

### Node Type Guides (`chains/parameter-updater/node-types/`)

| File | Export | Description |
|------|--------|-------------|
| `set-node.ts` | `SET_NODE_GUIDE` | Assignment structure & types |
| `if-node.ts` | `IF_NODE_GUIDE` | Filter conditions & operators |
| `switch-node.ts` | `SWITCH_NODE_GUIDE` | Rules and routing patterns |
| `http-request.ts` | `HTTP_REQUEST_GUIDE` | URL, headers, body, auth |
| `tool-nodes.ts` | `TOOL_NODES_GUIDE` | $fromAI expressions |

### Parameter Type Guides (`chains/parameter-updater/parameter-types/`)

| File | Export | Description |
|------|--------|-------------|
| `resource-locator.ts` | `RESOURCE_LOCATOR_GUIDE` | __rl structure & modes |
| `system-message.ts` | `SYSTEM_MESSAGE_GUIDE` | AI node message separation |
| `text-fields.ts` | `TEXT_FIELDS_GUIDE` | Expression embedding |

---

## What Goes Where

This section explains what type of information belongs in which file.

### Node-Based Best Practices

**Location:** `src/tools/best-practices/`

**Used By:** Discovery Agent (retrieves best practices based on identified techniques)

**Files:** Examples include `chatbot.ts`, `content-generation.ts`, `data-analysis.ts`, `data-extraction.ts`, `document-processing.ts`, `knowledge-base.ts`, etc.

**When to Edit:**
- Technique-specific requirements
- Common mistakes to avoid
- Required nodes for a technique
- Configuration recommendations

**Format:** Each file exports a class implementing `BestPracticesDocument` with a `getDocumentation()` method that returns markdown-formatted best practices.

### Technique-Specific Instructions

**Location:** Discovery Agent Prompt (`agents/discovery.prompt.ts`)

**Purpose:** Clarifies distinctions between similar techniques and provides categorization examples.

**When to Edit:**
- Technique definitions
- When to use one technique vs another
- Edge cases and distinctions
- Example categorizations (few-shot examples)

### Connection Rules

**Location:** Builder Agent Prompt (`agents/builder.prompt.ts`)

**Key Sections:**
- Node connection flow rules (source → target)
- AI sub-node connection patterns
- RAG workflow connection patterns
- Connection type examples (main, ai_languageModel, ai_tool, etc.)
- Connection parameter examples

**When to Edit:**
- Connection flow rules
- AI node connection patterns
- RAG workflow connection patterns
- Connection type handling

### Warnings and Critical Rules

**Location:** Multiple files

**Common Warning Sections:**
- Never rely on default values
- Always include Workflow Configuration node
- Required parameter configurations
- Common mistakes that cause runtime errors

**When to Edit:**
- Critical requirements that prevent failures
- Common mistakes that cause runtime errors
- Mandatory configurations

### Communication Style

**Location:** Responder Agent Prompt (`agents/responder.prompt.ts`)

**When to Edit:**
- How agents communicate with users
- Response formatting rules
- What to say vs what not to say
- Progress update rules

### Parameter Configuration Rules

**Location:** Configurator Agent Prompt (`agents/configurator.prompt.ts`) and Parameter Updater System (`chains/parameter-updater/`)

**When to Edit:**
- Parameter configuration rules
- Tool node `$fromAI` expression usage
- Required parameters list
- Default value warnings
- Node-specific parameter handling

---

## Editing Guidelines

### For Non-Engineers

1. **Find the Right File**: Use the [Quick Reference](#quick-reference) below to find which file contains what you want to change.

2. **Edit Text Directly**: Prompts are just text strings in TypeScript files. Look for:
   - String constants (e.g., `const SECTION_NAME = '...'`)
   - Template literals (backtick strings)
   - Function return values that build prompts

3. **Preserve Formatting**:
   - Keep string delimiters intact (quotes or backticks)
   - Preserve indentation and line breaks
   - Don't remove backticks or code formatting
   - Maintain markdown formatting within strings

4. **Test Your Changes**: After editing, the system will use your new prompts. Test with a workflow request to see if behavior changed as expected.

### For AI Agents

When instructed to edit prompts:

1. **Read the Target File**: Use `read_file` to read the file containing the prompt section.

2. **Locate the Section**: Find the section using:
   - String constant names (e.g., `ROUTING_DECISION_TREE`)
   - Function names that generate prompts (e.g., `buildSupervisorPrompt()`)
   - Comments that describe sections

3. **Make Targeted Edits**: Use `search_replace` to modify only the specific section, preserving:
   - String delimiters
   - Code structure
   - Indentation
   - Other sections

4. **Verify Context**: Ensure your edit fits the context and purpose of that prompt section.

### Common Edit Patterns

#### Adding a New Rule

```typescript
// Find the appropriate section, e.g.:
const CRITICAL_RULES = `CRITICAL: NEVER RELY ON DEFAULT PARAMETER VALUES

// Add your new rule:
- Your New Node Type: Always set parameter X explicitly`;
```

#### Updating Examples

```typescript
// Find example sections, e.g.:
const EXAMPLE_CATEGORIZATIONS = [
  {
    prompt: "Build a chatbot",
    techniques: ["CHATBOT"]
  },
  // Add or modify examples:
  {
    prompt: "Your new example",
    techniques: ["YOUR_TECHNIQUE"]
  }
];
```

#### Modifying Technique Definitions

```typescript
// In discovery.prompt.ts, find the technique list or examples
// Update the description or add new categorization examples
```

---

## Quick Reference

### "I want to change how the agent..."

| What You Want to Change | File | Section/Export |
|------------------------|------|----------------|
| **...routes requests** | `agents/supervisor.prompt.ts` | `buildSupervisorPrompt()`, `ROUTING_DECISION_TREE` |
| **...finds nodes** | `agents/discovery.prompt.ts` | `buildDiscoveryPrompt()`, example categorizations |
| **...categorizes techniques** | `agents/discovery.prompt.ts` | `exampleCategorizations`, technique clarifications |
| **...creates workflow structure** | `agents/builder.prompt.ts` | `buildBuilderPrompt()` |
| **...handles connections** | `agents/builder.prompt.ts` | Connection rules in `buildBuilderPrompt()` |
| **...sets node parameters** | `agents/configurator.prompt.ts` | `buildConfiguratorPrompt()` |
| **...uses $fromAI expressions** | `agents/configurator.prompt.ts` | Special expressions section |
| **...formats responses** | `agents/responder.prompt.ts` | `buildResponderPrompt()` |
| **...handles Set node updates** | `chains/parameter-updater/node-types/set-node.ts` | `SET_NODE_GUIDE` |
| **...handles IF node updates** | `chains/parameter-updater/node-types/if-node.ts` | `IF_NODE_GUIDE` |
| **...handles HTTP Request updates** | `chains/parameter-updater/node-types/http-request.ts` | `HTTP_REQUEST_GUIDE` |
| **...handles tool node updates** | `chains/parameter-updater/node-types/tool-nodes.ts` | `TOOL_NODES_GUIDE` |
| **...handles system messages** | `chains/parameter-updater/parameter-types/system-message.ts` | `SYSTEM_MESSAGE_GUIDE` |
| **...handles resource locators** | `chains/parameter-updater/parameter-types/resource-locator.ts` | `RESOURCE_LOCATOR_GUIDE` |
| **...best practices for chatbots** | `src/tools/best-practices/chatbot.ts` | `ChatbotBestPractices` class |
| **...best practices for RAG** | `src/tools/best-practices/knowledge-base.ts` | `KnowledgeBaseBestPractices` class |
| **...warns about defaults** | `agents/builder.prompt.ts` | Default value warnings |
| **...warns about defaults (configurator)** | `agents/configurator.prompt.ts` | Default value warnings |
| **...requires Workflow Configuration node** | `agents/builder.prompt.ts` | Workflow configuration section |

### Common Sections by Purpose

| Purpose | File | Sections to Edit |
|---------|------|-----------------|
| **Routing logic** | `agents/supervisor.prompt.ts` | `ROUTING_DECISION_TREE`, `KEY_DISTINCTION` |
| **Node discovery** | `agents/discovery.prompt.ts` | `buildDiscoveryPrompt()`, `exampleCategorizations` |
| **Connection patterns** | `agents/builder.prompt.ts` | Connection rules, RAG patterns, connection examples |
| **Parameter configuration** | `agents/configurator.prompt.ts` | Parameter configuration rules, `$fromAI` expressions |
| **Workflow structure** | `agents/builder.prompt.ts` | Node creation rules, workflow configuration requirements |
| **Error prevention** | `agents/builder.prompt.ts`, `agents/configurator.prompt.ts` | Default value warnings, required parameters |
| **Communication** | `agents/responder.prompt.ts` | Response style, completion messages |
| **Technique best practices** | `src/tools/best-practices/*.ts` | Entire best practices files |
