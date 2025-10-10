# Multi-Agent Supervisor Architecture Design

## Overview

This document outlines the design for refactoring the AI Workflow Builder from a single monolithic agent to a multi-agent supervisor pattern.

## Architecture Diagram

```
User Input
    ↓
Supervisor Agent (Planner)
    ↓
    ├─→ Discovery Agent
    │   ├─ search_nodes
    │   └─ get_node_details
    │
    ├─→ Builder Agent
    │   ├─ add_nodes
    │   ├─ connect_nodes
    │   ├─ remove_node
    │   └─ remove_connection
    │
    └─→ Configurator Agent
        ├─ update_node_parameters
        └─ get_node_parameter
    ↓
Result
```

## Agent Responsibilities

### 1. Supervisor Agent (Planner)
**Role:** High-level workflow planning and agent coordination

**Input Context:**
- User message
- Current workflow state (minimal: node count, names)
- Previous agent outputs

**Decisions:**
- Which agent to call next
- When workflow is complete
- Error recovery strategy

**No Tools** - Pure routing logic

**Prompt Focus:**
- Understand user intent
- Break down into phases (discover → build → configure)
- Route to appropriate specialist
- Know when to finish

**Estimated Token Usage:** ~2-3K tokens per call

---

### 2. Discovery Agent
**Role:** Find and analyze available nodes

**Tools:**
- `search_nodes` - Search node catalog
- `get_node_details` - Get detailed node information

**Input Context:**
- User requirements (what they want to build)
- Node type catalog (cached)

**Output:**
- List of relevant nodes found
- Node capabilities and requirements
- Connection types and parameters

**Prompt Focus:**
- Understand what nodes are needed
- Search effectively (parallel queries)
- Analyze node compatibility

**Estimated Token Usage:** ~3-5K tokens per call

---

### 3. Builder Agent
**Role:** Construct workflow structure (nodes + connections)

**Tools:**
- `add_nodes` - Create nodes
- `connect_nodes` - Wire nodes together
- `remove_node` - Remove nodes
- `remove_connection` - Remove connections

**Input Context:**
- Discovery agent output (nodes to create)
- Current workflow structure
- Node details from discovery

**Output:**
- Created nodes with IDs
- Established connections
- Workflow topology

**Prompt Focus:**
- Create nodes efficiently (parallel)
- Establish correct connections
- Handle connection parameters
- Proper node positioning (automatic)

**Estimated Token Usage:** ~4-6K tokens per call

---

### 4. Configurator Agent
**Role:** Configure node parameters

**Tools:**
- `update_node_parameters` - Update parameters via natural language
- `get_node_parameter` - Inspect current parameters

**Input Context:**
- User requirements
- Workflow structure (node names and types)
- Execution context (if available)
- Full workflow JSON (for parameter updates)

**Output:**
- Configured nodes
- Parameter update results

**Prompt Focus:**
- Understand parameter requirements
- Use $fromAI expressions correctly
- Configure all necessary parameters
- Handle complex parameter structures

**Estimated Token Usage:** ~5-8K tokens per call (includes sub-LLM)

---

## State Management

### Shared State Structure

```typescript
{
  messages: BaseMessage[],           // Full conversation history
  workflowJSON: SimpleWorkflow,      // Current workflow state
  workflowOperations: WorkflowOperation[], // Queued operations
  workflowContext: {                 // Execution context
    executionSchema?: NodeExecutionSchema[],
    currentWorkflow?: Partial<IWorkflowBase>,
    executionData?: IRunExecutionData['resultData']
  },

  // New: Agent-specific context
  discoveryResults?: {               // Output from Discovery Agent
    foundNodes: Array<{
      type: string,
      displayName: string,
      capabilities: string[]
    }>,
    recommendations: string
  },

  buildPlan?: {                      // Output from Supervisor
    phases: string[],
    currentPhase: string,
    nodesToCreate: string[]
  }
}
```

### Context Filtering Per Agent

Each agent receives only the context it needs:

**Supervisor:**
```typescript
{
  messages: [last 5 messages],
  workflowJSON: { nodes: [names only], connectionCount },
  discoveryResults: summary,
  buildPlan: current
}
```

**Discovery:**
```typescript
{
  messages: [user request + last supervisor message],
  // No workflow JSON needed
}
```

**Builder:**
```typescript
{
  messages: [relevant messages],
  workflowJSON: full structure,
  discoveryResults: full,
  // No execution context needed
}
```

**Configurator:**
```typescript
{
  messages: [relevant messages],
  workflowJSON: full (for parameter updates),
  workflowContext: full,
  // No discovery results needed
}
```

---

## Execution Flow

### Example: "Create a workflow that fetches weather data and sends email"

1. **User Input** → Supervisor
   - Supervisor analyzes: needs discovery, building, configuration
   - Routes to: Discovery Agent

2. **Discovery Agent**
   - Searches: "HTTP Request", "email", "trigger"
   - Gets details: HTTP Request node, Gmail node, Schedule Trigger
   - Returns: Node capabilities and requirements
   - Routes to: Supervisor

3. **Supervisor**
   - Reviews discovery results
   - Decides: Ready to build
   - Routes to: Builder Agent

4. **Builder Agent**
   - Creates nodes in parallel: Schedule Trigger, HTTP Request, Gmail
   - Connects: Trigger → HTTP Request → Gmail
   - Returns: Workflow structure created
   - Routes to: Supervisor

5. **Supervisor**
   - Reviews structure
   - Decides: Needs configuration
   - Routes to: Configurator Agent

6. **Configurator Agent**
   - Configures HTTP Request: URL for weather API
   - Configures Gmail: Uses $fromAI expressions
   - Returns: All nodes configured
   - Routes to: Supervisor

7. **Supervisor**
   - Reviews completion
   - Decides: Workflow complete
   - Routes to: END

---

## Implementation Strategy

### Phase 1: Create Agent Modules
- [ ] Create `/agents` directory
- [ ] Implement Discovery Agent
- [ ] Implement Builder Agent
- [ ] Implement Configurator Agent
- [ ] Implement Supervisor Agent

### Phase 2: Create Graph
- [ ] Define agent state reducers
- [ ] Create subgraphs for each agent
- [ ] Wire agents with supervisor routing
- [ ] Add error handling

### Phase 3: Integration
- [ ] Update WorkflowBuilderAgent class
- [ ] Add feature flag for multi-agent mode
- [ ] Maintain backward compatibility
- [ ] Add logging and metrics

### Phase 4: Testing & Optimization
- [ ] Unit tests for each agent
- [ ] Integration tests for full flow
- [ ] Performance benchmarks
- [ ] Token usage analysis

---

## Benefits vs. Current Architecture

| Aspect | Current (Single Agent) | New (Multi-Agent) |
|--------|----------------------|-------------------|
| Context per call | ~10-15K tokens | ~2-8K tokens per agent |
| Parallelization | Limited by prompt | Natural per phase |
| Debugging | One large agent | Isolated specialists |
| Prompt complexity | 400+ lines | 50-100 lines per agent |
| Extensibility | Hard to add features | Easy to add specialists |
| Cost per request | High (full context) | Lower (filtered context) |
| Latency | Sequential tools | Parallel within phases |

---

## Backward Compatibility

During rollout, support both architectures:

```typescript
export class WorkflowBuilderAgent {
  private useMultiAgent: boolean;

  constructor(config: WorkflowBuilderAgentConfig) {
    this.useMultiAgent = config.enableMultiAgent ?? false;
  }

  private createWorkflow() {
    if (this.useMultiAgent) {
      return this.createMultiAgentWorkflow();
    }
    return this.createLegacyWorkflow();
  }
}
```

---

## Open Questions

1. **Supervisor Intelligence**: Should supervisor use structured output or tools?
2. **Error Recovery**: How do agents report failures back to supervisor?
3. **Iterative Refinement**: How to handle "modify node X" requests?
4. **State Size**: Should we trim conversation history between agents?
5. **Metrics**: What KPIs should we track for each agent?

---

## Next Steps

1. Review this design with team
2. Create spike branch: `ai-1501-spike-splitting-the-agent-into-sub-agents`
3. Implement Phase 1 (agent modules)
4. Create proof-of-concept with simple workflow
5. Measure and compare metrics
