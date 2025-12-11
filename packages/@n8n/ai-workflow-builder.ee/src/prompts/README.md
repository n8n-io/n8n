# AI Workflow Builder Prompts

Centralized prompts for the n8n AI Workflow Builder. This directory contains all prompts used by agents and chains.
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

### Builder (`agents/builder.prompt.ts`)

Constructs workflow structure by creating nodes and connections.

| Export | Description |
|--------|-------------|
| `buildBuilderPrompt()` | Builds the builder system prompt |

**Key sections:** Node creation rules, connection parameters, AI connections, RAG patterns

### Configurator (`agents/configurator.prompt.ts`)

Sets up node parameters using natural language instructions.

| Export | Description |
|--------|-------------|
| `buildConfiguratorPrompt()` | Builds the configurator system prompt |
| `INSTANCE_URL_PROMPT` | Template with `{instanceUrl}` variable |

**Input variables:** `{instanceUrl}`

### Responder (`agents/responder.prompt.ts`)

Generates user-facing responses and handles conversational queries.

| Export | Description |
|--------|-------------|
| `buildResponderPrompt()` | Builds the responder system prompt |

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
