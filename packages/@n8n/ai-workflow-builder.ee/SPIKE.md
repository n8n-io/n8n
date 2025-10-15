# Multi-Agent Subgraph Architecture Spike

## Problem

### V1 Architecture Issues

The original single-agent design has limitations:

1. **Context Bloat**: Agent received 20K+ tokens per call
   - Full workflow JSON (grows with each node)
   - Filtered node type catalog
   - All 8 tool definitions
   - 400+ line prompt

2. **Monolithic Prompt**: Single 400-line prompt trying to do everything
   - Discovery: "Search for nodes"
   - Building: "Add nodes and connect them"
   - Configuration: "Set all parameters"
   - Mixed responsibilities = confused agent

3. **No Specialization**: One agent with 8 tools
   - Agent must context-switch between tasks
   - Cannot optimize prompts per phase
   - Cannot use different LLMs per task complexity

4. **No Evaluation Granularity**: Single agent output
   - Can only evaluate complete workflow generation
   - Cannot easily isolate which stage failed (discovery? building? configuration?)
   - No training data per stage for fine-tuning

---

## Solution: Multi-Agent Subgraph Pattern

### Architecture Overview

**Parent Graph Flow**:
```
User Request → Supervisor → [Responder | Discovery | Builder | Configurator]
                    ↑            |         |           |            |
                    |            ↓         ↓           ↓            ↓
                    |          END    (loops back) (loops)   (loops back)
                    └───────────────────┴──────────────┴───────────┘
```

Only **Responder** ends the flow (answers questions, then done).
All workflow subgraphs (Discovery, Builder, Configurator) loop back to Supervisor for next routing decision.

**Discovery Subgraph** (Isolated):
```
Agent → Has tools? → Yes → Execute Tools → Agent (loop)
         ↓ No
      Extract Results → Return {nodesFound, relevantContext, summary}
```

**Builder Subgraph** (Isolated):
```
Agent → Has tools? → Yes → Execute Tools → Process Operations → Agent (loop)
         ↓ No
      Return {workflowJSON, messages}
```

**Configurator Subgraph** (Isolated):
```
Agent → Has tools? → Yes → Execute Tools → Process Operations → Agent (loop)
         ↓ No
      Return {workflowJSON, finalResponse}
```

### Key Design Decisions

#### 1. Subgraphs vs Shared Message History

**Tried**: Multi-agent with shared message history
**Problem**: Agents saw each other's tool calls and tried to execute them ("tool contamination")
**Solution**: LangGraph subgraphs with isolated state

Each subgraph:
- Has its own message history (no contamination)
- Loops internally until task complete
- Returns structured results to parent graph

#### 2. Parent Graph State (Minimal)

```typescript
ParentGraphState = {
  messages: BaseMessage[],              // For Responder only
  workflowJSON: SimpleWorkflow,         // Shared workflow being built
  workflowContext: {                    // Execution data passed to subgraphs selectively
    executionData: {...},
    executionSchema: [...]
  },
  nextPhase: string,                    // Supervisor's routing decision
  supervisorInstructions: string | null, // Guidance for next agent
  discoveryResults: {                   // Structured handoff
    nodesFound: Array<{nodeType, reasoning}>,
    relevantContext: Array<{context, relevancy}>,
    summary: string
  }
}
```

**Critical insight**: Parent state is MINIMAL. Each subgraph gets inputs, returns outputs. No shared execution state.

**workflowContext** is passed to Builder and Configurator subgraphs to provide execution data for context-aware configuration.

#### 3. Context Passing Between Subgraphs

**Discovery → Builder**:
```typescript
// Discovery outputs
{
  nodesFound: [
    {nodeType: INodeTypeDescription, reasoning: "Fetches weather data"},
    {nodeType: INodeTypeDescription, reasoning: "Sends emails"}
  ],
  relevantContext: [
    {context: "Connect sequentially: Trigger → HTTP → Gmail", relevancy: "builder"},
    {context: "HTTP needs POST method", relevancy: "configurator"}
  ]
}

// Builder receives formatted context
`
Build workflow for: <user request>

--- Discovery Results ---
Nodes to use:
- HTTP Request (n8n-nodes-base.httpRequest): Fetches weather data
- Gmail (n8n-nodes-base.gmail): Sends emails

Context for Builder:
- Connect sequentially: Trigger → HTTP → Gmail
`
```

**No string parsing** - structured data passed between subgraphs, formatted only at handoff.

#### 4. Supervisor Instructions

Supervisor provides specific guidance to each agent:

```typescript
// Supervisor routing decision
{
  next: "discovery",
  instructions: "Search for weather API nodes and email notification nodes"
}

// Discovery subgraph receives instructions
invoke({
  userRequest: "Build weather alert workflow",
  supervisorInstructions: "Search for weather API nodes and email notification nodes"
})
```

All three subgraphs support `supervisorInstructions` input for dynamic guidance.

#### 5. Tool Execution Pattern

**Within each subgraph**:
```typescript
agent → tools → process_operations → agent (loop until done)
```

- **Tools execute in parallel** via `Promise.all()`
- **No parent graph involvement** in tool execution
- **Results processed immediately** before returning to agent

**Helper function** eliminates code duplication:
```typescript
// Used by all 3 subgraphs
executeSubgraphTools(state, toolMap) {
  // Execute all tool_calls in parallel
  // Unwrap Command objects
  // Return {messages, workflowOperations}
}
```

---

## Benefits & Drawbacks

### Benefits

#### 1. Granular Control Over Individual Stages

Each stage has its own isolated system message and toolset:

**Focused Prompts**:
- Discovery: ~80 lines focused on context gathering
- Builder: ~75 lines focused on structure creation
- Configurator: ~95 lines focused on parameter configuration
- vs V1: 400+ lines trying to do everything

**Thinking Budget Control**:
```typescript
// Can enable extended_thinking for complex stages only
const builderSubgraph = createBuilderSubgraph({
  llm: llmComplexTask.withConfig({
    extended_thinking: { enabled: true, budget_tokens: 5000 }
  })
});

// Keep supervisor fast without thinking
const supervisorAgent = new SupervisorAgent({
  llm: llmSimpleTask  // No thinking budget needed for routing
});
```

**Stage-Specific Evaluation**:
```typescript
// Evaluate discovery independently
const discoveryEval = await evaluateDiscovery({
  input: "Weather alert workflow",
  expectedNodes: ["scheduleTrigger", "httpRequest", "gmail"],
  expectedContext: ["Connect sequentially", "HTTP needs POST"]
});

// Evaluate builder independently
const builderEval = await evaluateBuilder({
  input: {discoveryResults, userRequest},
  expectedStructure: {nodeCount: 3, connectionCount: 2}
});

// Evaluate configurator independently
const configuratorEval = await evaluateConfigurator({
  input: {workflowJSON, workflowContext},
  expectedParameters: {httpMethod: "GET", gmailRecipient: "..."}
});
```

**Eval Resolution**: Can pinpoint exact stage failures and metrics

#### 2. Stage-Specific Context Filtering

Discovery can tag context for downstream consumers:

```typescript
// Discovery outputs
relevantContext: [
  {
    context: "Connect trigger → HTTP → Gmail sequentially",
    relevancy: "builder"  // Only builder sees this
  },
  {
    context: "HTTP Request needs POST method and /weather endpoint",
    relevancy: "configurator"  // Only configurator sees this
  }
]
```

**Benefits**:
- Builder doesn't see parameter configuration details
- Configurator doesn't see connection topology advice
- Each agent gets minimal, relevant context only

**Future optimization**: Filter node type definitions by stage
- Discovery: All nodes (needs to search)
- Builder: Only discovered nodes (smaller context)
- Configurator: Only nodes in current workflow (smallest context)

#### 3. Fine-Tuning Dataset Generation

Each subgraph produces clean input/output pairs:

```typescript
// Discovery training data
{
  input: "Build weather alert workflow",
  output: {
    nodesFound: [{nodeType: scheduleTrigger, reasoning: "..."}, ...],
    relevantContext: [{context: "...", relevancy: "builder"}, ...]
  }
}

// Builder training data
{
  input: {discoveryResults, userRequest, workflowJSON},
  output: {
    workflowJSON: {nodes: [...], connections: {...}},
    summary: "Created 3 nodes and connected sequentially"
  }
}

// Configurator training data
{
  input: {workflowJSON, workflowContext},
  output: {
    workflowJSON: {nodes: [{parameters: {...}}, ...]},
    finalResponse: "Configured all nodes. Ready to run."
  }
}
```

**Distillation strategy**:
1. Run V2 with expensive models (Claude Sonnet/Opus)
2. Collect subgraph input/output pairs
3. Fine-tune smaller/cheaper models on stage-specific data
4. Replace expensive models with fine-tuned ones per stage

#### 4. Extensibility Through Subgraphs

Adding new functionality is cleaner - **add a subgraph, not tools to root agent**.

**Example: Add validation stage**:
```typescript
// V1 approach: Add tools to monolithic agent
const v1Agent = new WorkflowBuilderAgent({
  tools: [
    ...existingTools,  // Already 8 tools
    createValidateWorkflowTool(),  // +1 = 9 tools
    createCheckCompatibilityTool()  // +1 = 10 tools
  ]
});
// Agent now has 10 tools, 500+ line prompt, context grows
```

```typescript
// V2 approach: Add validation subgraph
const validationSubgraph = createValidationSubgraph({
  llm: llmComplexTask,
  parsedNodeTypes
});

parentGraph
  .addNode('validation', callValidationSubgraph)
  .addEdge('configurator', 'supervisor')  // Configurator loops back
  .addConditionalEdges('supervisor', route, {
    validation: 'validation'  // New route
  });
```

**Benefits**:
- Root agent stays simple (only routing)
- New subgraph is isolated with own prompt/tools
- Can evaluate validation independently
- Can use different LLM for validation (e.g., faster model for simple checks)
- No impact on existing subgraphs

**Future extensions**:
- Testing subgraph: Generate test data for workflows
- Documentation subgraph: Generate workflow stickies documentation
- Migration subgraph: Upgrade workflows to new node versions

### Drawbacks

#### 1. Increased Complexity

**State Management**:
- Parent graph state (7 fields)
- Discovery subgraph state (7 fields)
- Builder subgraph state (7 fields)
- Configurator subgraph state (8 fields)

**Handoff Logic**:
- Supervisor extracts instructions → parent state
- Parent formats discovery results → builder input
- Parent passes workflowContext → builder/configurator inputs

**Debugging**:
- Must trace through parent graph + 3 subgraphs
- Each subgraph has internal loops
- Streaming events come from multiple sources

---

## File Structure (Post-Implementation)

```
src/
├── agents/
│   ├── supervisor.agent.ts         # Parent graph routing
│   └── responder.agent.ts          # Conversational queries
├── subgraphs/
│   ├── discovery.subgraph.ts       # Context gathering (nodes + context)
│   ├── builder.subgraph.ts         # Structure creation (nodes + connections)
│   ├── configurator.subgraph.ts    # Parameter configuration
│   └── index.ts                    # Exports
├── utils/
│   ├── subgraph-helpers.ts         # Shared tool execution logic
│   ├── operations-processor.ts     # Workflow mutation processor
│   ├── stream-processor.ts         # Stream event handling
│   └── trim-workflow-context.ts    # Context optimization
├── tools/                          # 8 tools (unchanged)
├── multi-agent-workflow-subgraphs.ts  # Parent graph factory
└── workflow-builder-agent.ts       # Public API (updated to use subgraphs)
```
