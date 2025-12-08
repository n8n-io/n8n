# AI Workflow Builder Prompts

Centralized prompts for the n8n AI Workflow Builder. This directory contains all prompts used by agents and chains.

**This guide is designed for both AI agents and non-engineers** - prompt changes are text changes, so you can edit them directly.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Overview](#overview)
3. [Multi-Agent Prompts](#multi-agent-prompts)
4. [Legacy Agent Prompt](#legacy-agent-prompt)
5. [Chain Prompts](#chain-prompts)
6. [Parameter Updater System](#parameter-updater-system)
7. [What Goes Where](#what-goes-where)
8. [Editing Guidelines](#editing-guidelines)
9. [Quick Reference](#quick-reference)

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

## Multi-Agent Prompts

### Supervisor (`agents/supervisor.prompt.ts`)

Routes user requests to the appropriate specialist agent.

**Purpose:** Routing decisions - which agent should handle the request.

**Key Sections:**
- `AVAILABLE AGENTS` - List of agents and their roles
- `ROUTING DECISION TREE` - Decision logic
- `KEY DISTINCTION` - Replacement vs Configuration

**When to Edit:**
- Routing logic
- Agent role definitions
- When to route to which agent

| Export | Description |
|--------|-------------|
| `buildSupervisorPrompt()` | Builds the supervisor system prompt |
| `SUPERVISOR_PROMPT_SUFFIX` | Suffix asking "which agent should act next?" |

**Routing targets:** discovery, builder, configurator, responder

---

### Discovery (`agents/discovery.prompt.ts`)

Identifies relevant n8n nodes and categorizes workflow techniques.

**Purpose:** Instructions for finding relevant n8n nodes based on user requests.

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

**Example Categorizations:** The file contains example prompt-to-technique mappings that guide categorization.

| Export | Description |
|--------|-------------|
| `buildDiscoveryPrompt(options)` | Builds prompt with optional examples phase |
| `formatTechniqueList()` | Formats available techniques as bullet list |
| `formatExampleCategorizations()` | Formats few-shot examples |
| `exampleCategorizations` | 14 few-shot classification examples |
| `DiscoveryPromptOptions` | Type: `{ includeExamples: boolean }` |

**Input variables:** `{techniques}`, `{exampleCategorizations}`

---

### Builder (`agents/builder.prompt.ts`)

Constructs workflow structure by creating nodes and connections.

**Purpose:** Instructions for creating workflow structure (nodes and connections).

**Key Sections:**
- `MANDATORY EXECUTION SEQUENCE` - Step-by-step building process
- `NODE CREATION` - How to create nodes
- `<workflow_configuration_node>` - Workflow Configuration node placement
- `<data_parsing_strategy>` - Data parsing preferences
- `<proactive_design>` - Anticipating needs
- `<node_defaults_warning>` - Connection parameter warnings
- `CONNECTION PARAMETERS EXAMPLES` - Examples for different node types
- `<node_connections_understanding>` - Connection flow rules
- `<agent_node_distinction>` - AI Agent types
- `<rag_workflow_pattern>` - RAG workflow specific patterns
- `<connection_type_examples>` - Connection type examples

**When to Edit:**
- Node creation rules
- Connection patterns
- Workflow structure requirements
- RAG workflow specific instructions
- AI node connection rules

| Export | Description |
|--------|-------------|
| `buildBuilderPrompt()` | Builds the builder system prompt |

---

### Configurator (`agents/configurator.prompt.ts`)

Sets up node parameters using natural language instructions.

**Purpose:** Instructions for setting node parameters after structure is built.

**Key Sections:**
- `MANDATORY EXECUTION SEQUENCE` - Configuration process
- `WORKFLOW JSON DETECTION` - When to configure
- `PARAMETER CONFIGURATION` - How to set parameters
- `SPECIAL EXPRESSIONS FOR TOOL NODES` - $fromAI syntax
- `CRITICAL PARAMETERS TO ALWAYS SET` - Required parameters
- `NEVER RELY ON DEFAULT VALUES` - Default value warnings
- `<response_format>` - How to summarize configuration

**When to Edit:**
- Parameter configuration rules
- Tool node $fromAI expression usage
- Required parameters list
- Default value warnings

| Export | Description |
|--------|-------------|
| `buildConfiguratorPrompt()` | Builds the configurator system prompt |
| `INSTANCE_URL_PROMPT` | Template with `{instanceUrl}` variable |

**Input variables:** `{instanceUrl}`

---

### Responder (`agents/responder.prompt.ts`)

Generates user-facing responses and handles conversational queries.

**Purpose:** Synthesizing user-facing responses from internal context.

**Key Sections:**
- `FOR WORKFLOW COMPLETION RESPONSES` - How to format completion messages
- `FOR QUESTIONS/CONVERSATIONS` - How to answer questions
- `RESPONSE STYLE` - Communication guidelines

**When to Edit:**
- Response formatting
- User communication style
- How to present workflow information

| Export | Description |
|--------|-------------|
| `buildResponderPrompt()` | Builds the responder system prompt |

---

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

---

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

---

### Compact (`chains/compact.prompt.ts`)

Summarizes multi-turn conversations for context management.

| Export | Description |
|--------|-------------|
| `compactPromptTemplate` | PromptTemplate for summarization |

**Input variables:** `{previousSummary}`, `{conversationText}`

**Output:** Structured summary with key_decisions, current_state, next_steps

---

### Workflow Name (`chains/workflow-name.prompt.ts`)

Generates descriptive workflow names.

| Export | Description |
|--------|-------------|
| `workflowNamingPromptTemplate` | PromptTemplate for naming |

**Input variables:** `{initialPrompt}`

---

## Parameter Updater System

A modular system for building context-aware prompts for node parameter updates.

**Location:** `chains/parameter-updater/`

**Purpose:** Dynamic prompts for parameter updates, organized by node type and parameter type. Used by the Configurator agent for parameter configuration.

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

**How It Works:** The `prompt-builder.ts` file dynamically assembles these prompts based on the node type and parameters being updated.

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

**Examples include:** `set-node.ts`, `if-node.ts`, `http-request.ts`, etc.

### Parameter Type Guides (`chains/parameter-updater/parameter-types/`)

| File | Export | Description |
|------|--------|-------------|
| `resource-locator.ts` | `RESOURCE_LOCATOR_GUIDE` | __rl structure & modes |
| `system-message.ts` | `SYSTEM_MESSAGE_GUIDE` | AI node message separation |
| `text-fields.ts` | `TEXT_FIELDS_GUIDE` | Expression embedding |

### Examples (`chains/parameter-updater/examples/`)

- `examples/basic/set-node-examples.ts` - Set node examples
- `examples/basic/if-node-examples.ts` - IF node examples
- `examples/basic/simple-updates.ts` - Simple update examples
- `examples/advanced/tool-node-examples.ts` - Tool node examples
- `examples/advanced/resource-locator-examples.ts` - Resource locator examples

**When to Edit:**
- Node-specific parameter rules
- Parameter type handling
- Example patterns for updates

### Instance URL Prompt (`chains/parameter-updater/instance-url.ts`)

**Purpose:** Context about the n8n instance URL for webhook/chat trigger nodes. Used by the Configurator agent.

**When to Edit:**
- Webhook URL construction rules
- Chat trigger URL requirements

---

## What Goes Where

### Node-Based Best Practices (Shared)

**Location:** `src/tools/best-practices/`

**Used By:** Discovery Agent (retrieves best practices based on identified techniques)

**Files:**
Examples include: `chatbot.ts`, `content-generation.ts`, `data-analysis.ts`, `data-extraction.ts`, etc.

**When to Edit:**
- Technique-specific requirements
- Common mistakes to avoid
- Required nodes for a technique
- Configuration recommendations

**Format:** Each file exports a `BestPractice` object with:
- `description`: What the technique is
- `requirements`: Required nodes/configurations
- `recommendations`: Best practice suggestions
- `commonMistakes`: Mistakes to avoid

---

### Technique-Specific Instructions

**Location:** Discovery Agent Prompt (`agents/discovery.prompt.ts`)

**Section:** `<technique_clarifications>`

**Purpose:** Clarifies distinctions between similar techniques.

**When to Edit:**
- Technique definitions
- When to use one technique vs another
- Edge cases and distinctions

**Examples:**
- NOTIFICATION vs CHATBOT
- MONITORING vs SCHEDULING
- SCRAPING_AND_RESEARCH vs DATA_EXTRACTION
- TRIAGE vs DATA_ANALYSIS

---

### Connection Rules

**Location:** Builder Agent Prompt (`agents/builder.prompt.ts`)

**Key Sections:**
- `<node_connections_understanding>` - Connection flow rules
- `<rag_workflow_pattern>` - RAG workflow connection patterns
- `CONNECTION PARAMETERS EXAMPLES` - Connection type examples

**When to Edit:**
- Connection flow rules (source → target)
- AI sub-node connection patterns
- RAG workflow connection patterns
- Connection type examples (main, ai_languageModel, ai_tool, etc.)

---

### Warnings and Critical Rules

**Location:** Multiple files

**Common Warning Sections:**
- `<node_defaults_warning>` (Builder) - Never rely on default values
- `<workflow_configuration_node>` (Builder) - Always include Workflow Configuration node
- `NEVER RELY ON DEFAULT VALUES` (Configurator) - Configurator agent warnings

**When to Edit:**
- Critical requirements that prevent failures
- Common mistakes that cause runtime errors
- Mandatory configurations

---

### Communication Style

**Location:** Responder Agent Prompt (`agents/responder.prompt.ts`)

**Section:** `RESPONSE STYLE`

**When to Edit:**
- How agents communicate with users
- Response formatting rules
- What to say vs what not to say
- Progress update rules

---

## Editing Guidelines

### For Non-Engineers

1. **Find the Right File**: Use the [Quick Reference](#quick-reference) below to find which file contains what you want to change.

2. **Edit Text Directly**: Prompts are just text strings in TypeScript files. Look for sections marked with XML-like tags (e.g., `<workflow_configuration_node>`) or clear section headers.

3. **Preserve Formatting**: 
   - Keep XML tags intact: `<section_name>` and `</section_name>`
   - Preserve indentation and line breaks
   - Don't remove backticks or code formatting

4. **Test Your Changes**: After editing, the system will use your new prompts. Test with a workflow request to see if behavior changed as expected.

### For AI Agents

When instructed to edit prompts:

1. **Read the Target File**: Use `read_file` to read the file containing the prompt section.

2. **Locate the Section**: Find the section using:
   - XML tags: `<section_name>...</section_name>`
   - Section headers in comments
   - Function names that generate prompts

3. **Make Targeted Edits**: Use `search_replace` to modify only the specific section, preserving:
   - XML tags
   - Code structure
   - Indentation
   - Other sections

4. **Verify Context**: Ensure your edit fits the context and purpose of that prompt section.

### Node Naming Conventions in Prompts

**Important:** When referencing nodes in prompts, always use the **display name** (e.g., "Edit Fields", "IF", "Filter") rather than the type name (e.g., "set", "n8n-nodes-base.set").

**Why:** The node search engine uses weighted fuzzy matching across multiple fields:
- `displayName` has the highest weight (1.5)
- `name` (type name) has lower weight (1.3)
- `codex.alias` has weight (1.0)
- `description` has weight (0.7)

Since `displayName` is weighted highest, using display names in prompts makes it more likely the AI will successfully find and reference the correct nodes when searching.

**Examples:**
- ✅ **Good:** "Use the Edit Fields node to transform data"
- ❌ **Avoid:** "Use the Set node" (type name)
- ❌ **Avoid:** "Use n8n-nodes-base.set" (full type identifier)

---

## Quick Reference

### "I want to change how the agent..."

| What You Want to Change | File | Section/Line |
|------------------------|------|--------------|
| **...routes requests** | `agents/supervisor.prompt.ts` | `SUPERVISOR_PROMPT` |
| **...finds nodes** | `agents/discovery.prompt.ts` | `DISCOVERY_PROMPT` |
| **...categorizes techniques** | `agents/discovery.prompt.ts` | `<technique_clarifications>` |
| **...creates workflow structure** | `agents/builder.prompt.ts` | `BUILDER_PROMPT` |
| **...handles connections** | `agents/builder.prompt.ts` | `<node_connections_understanding>` |
| **...sets node parameters** | `agents/configurator.prompt.ts` | `CONFIGURATOR_PROMPT` |
| **...uses $fromAI expressions** | `agents/configurator.prompt.ts` | `SPECIAL EXPRESSIONS FOR TOOL NODES` |
| **...formats responses** | `agents/responder.prompt.ts` | `RESPONDER_PROMPT` |
| **...handles Set node updates** | `chains/parameter-updater/node-types/set-node.ts` | Entire file |
| **...handles IF node updates** | `chains/parameter-updater/node-types/if-node.ts` | Entire file |
| **...handles HTTP Request updates** | `chains/parameter-updater/node-types/http-request.ts` | Entire file |
| **...handles tool node updates** | `chains/parameter-updater/node-types/tool-nodes.ts` | Entire file |
| **...handles system messages** | `chains/parameter-updater/parameter-types/system-message.ts` | Entire file |
| **...handles resource locators** | `chains/parameter-updater/parameter-types/resource-locator.ts` | Entire file |
| **...best practices for chatbots** | `src/tools/best-practices/chatbot.ts` | Entire file |
| **...best practices for RAG** | `src/tools/best-practices/knowledge-base.ts` | Entire file |
| **...warns about defaults** | `agents/builder.prompt.ts` | `<node_defaults_warning>` |
| **...warns about defaults (configurator)** | `agents/configurator.prompt.ts` | `NEVER RELY ON DEFAULT VALUES` |
| **...requires Workflow Configuration node** | `agents/builder.prompt.ts` | `<workflow_configuration_node>` |

### Common Sections by Purpose

| Purpose | File | Sections to Edit |
|---------|------|-----------------|
| **Routing logic** | `agents/supervisor.prompt.ts` | `ROUTING DECISION TREE`, `KEY DISTINCTION` |
| **Node discovery** | `agents/discovery.prompt.ts` | `DISCOVERY_PROMPT`, `<technique_clarifications>` |
| **Connection patterns** | `agents/builder.prompt.ts` | `<node_connections_understanding>`, `<rag_workflow_pattern>`, `CONNECTION PARAMETERS EXAMPLES` |
| **Parameter configuration** | `agents/configurator.prompt.ts` | `PARAMETER CONFIGURATION`, `SPECIAL EXPRESSIONS FOR TOOL NODES` |
| **Workflow structure** | `agents/builder.prompt.ts` | `MANDATORY EXECUTION SEQUENCE`, `<workflow_configuration_node>`, `<proactive_design>` |
| **Error prevention** | `agents/builder.prompt.ts`, `agents/configurator.prompt.ts` | `<node_defaults_warning>`, `NEVER RELY ON DEFAULT VALUES` |
| **Communication** | `agents/responder.prompt.ts` | `RESPONSE STYLE`, `FOR WORKFLOW COMPLETION RESPONSES` |
