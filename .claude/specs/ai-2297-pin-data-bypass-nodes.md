# Implementation Plan: Pin Data for HTTP-Bypass Nodes

**Linear:** [AI-2297](https://linear.app/n8n/issue/AI-2297)
**Branch:** `ai-2297-pin-data-for-ailangchain-nodes-and-other-http-bypass-nodes`

## Problem

The eval framework intercepts HTTP requests at `request-helper-functions.ts` via
`additionalData.evalLlmMockHandler`. Nodes that bypass this layer fail during eval:

- **AI/LangChain root nodes** — sub-nodes use vendor SDKs (OpenAI, Anthropic, etc.) that call `fetch`/undici directly
- **Protocol nodes** — Redis, MongoDB, Kafka, etc. use TCP/binary protocols
- **Misc HTTP bypass** — RSS Feed Read, Git, Snowflake use non-helper HTTP

**Solution:** Detect these nodes, generate pin data via LLM, and pin them so
`execute()` is completely skipped (`workflow-execute.ts:1648-1654`). For Agent
nodes, pinning the root also prevents `supplyData()` on all connected sub-nodes.

## Data Flow

```
Phase 1:   generateMockHints()       → globalContext, triggerContent, nodeHints
Phase 1.5: generateBypassPinData()   → bypassPinData (Agent, Redis, etc.)
Phase 2:   execute()                 → merge trigger + bypass pin data
           → HTTP nodes mock-executed via evalLlmMockHandler (unchanged)
           → Bypass nodes skipped entirely via pin data
```

## Step-by-Step Implementation

### Step 1: Extend `MockHints` type and API schema

Add `bypassPinData` to carry the generated pin data from Phase 1.5 to Phase 2.

**File: `packages/cli/src/modules/instance-ai/eval-workflow-analysis.ts`**

Add field to `MockHints` interface (~line 66):

```typescript
export interface MockHints {
  globalContext: string;
  nodeHints: Record<string, string>;
  triggerContent: Record<string, unknown>;
  warnings: string[];
  /** Pin data for nodes that bypass the HTTP mock layer (AI roots, protocol nodes) */
  bypassPinData: IPinData;
}
```

**File: `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts`**

Add matching field to `InstanceAiEvalMockHints`:

```typescript
export interface InstanceAiEvalMockHints {
  globalContext: string;
  triggerContent: Record<string, unknown>;
  nodeHints: Record<string, string>;
  warnings: string[];
  /** Pin data generated for nodes that bypass the HTTP mock layer */
  bypassPinData: Record<string, Array<{ json: Record<string, unknown> }>>;
}
```

---

### Step 2: Add bypass node detection

Add `findAiRootNodeNames()`, `BYPASS_NODE_TYPES`, and `identifyNodesForPinData()`
to `eval-workflow-analysis.ts`.

**File: `packages/cli/src/modules/instance-ai/eval-workflow-analysis.ts`**

**2a. Port `findAiRootNodeNames()` from `service-node-classifier.ts:68-86`.**

This finds nodes that are *destinations* (targets) of `ai_*` connections — these
are the root AI nodes (Agent, Chain) whose sub-nodes can't be individually pinned.

> **Note on existing code:** The existing `findAiSubNodeNames()` in this file
> misleadingly returns the same set (targets of `ai_*` connections = root names),
> not actual sub-node names. The `service-node-classifier.ts` version correctly
> uses `sourceName` for sub-nodes. The existing function works for its current
> purpose (excluding roots from hints) but the name is misleading. We add the
> correctly-named `findAiRootNodeNames()` for clarity.

```typescript
function findAiRootNodeNames(workflow: IWorkflowBase): Set<string> {
  const roots = new Set<string>();
  for (const nodeConns of Object.values(workflow.connections)) {
    for (const [connType, outputs] of Object.entries(nodeConns)) {
      if (!connType.startsWith('ai_') || !Array.isArray(outputs)) continue;
      for (const group of outputs) {
        if (!Array.isArray(group)) continue;
        for (const conn of group) {
          if (typeof conn === 'object' && conn !== null && 'node' in conn) {
            roots.add((conn as { node: string }).node);
          }
        }
      }
    }
  }
  return roots;
}
```

**2b. Add `BYPASS_NODE_TYPES` constant.**

Curated set of node types that use non-HTTP protocols or bypass request helpers:

```typescript
const BYPASS_NODE_TYPES = new Set([
  // Databases (TCP/binary protocol)
  'n8n-nodes-base.redis',
  'n8n-nodes-base.mongoDb',
  'n8n-nodes-base.mySql',
  'n8n-nodes-base.postgres',
  'n8n-nodes-base.microsoftSql',
  'n8n-nodes-base.snowflake',
  // Message queues (TCP/binary protocol)
  'n8n-nodes-base.kafka',
  'n8n-nodes-base.rabbitmq',
  'n8n-nodes-base.mqtt',
  'n8n-nodes-base.amqp',
  // File/network protocols
  'n8n-nodes-base.ftp',
  'n8n-nodes-base.ssh',
  'n8n-nodes-base.ldap',
  'n8n-nodes-base.emailSend',
  // Non-helper HTTP
  'n8n-nodes-base.rssFeedRead',
  'n8n-nodes-base.git',
]);
```

**2c. Add `identifyNodesForPinData()` (exported).**

Combines AI root detection + bypass list. Returns nodes that need pinning:

```typescript
export function identifyNodesForPinData(workflow: IWorkflowBase): INode[] {
  const aiRootNodes = findAiRootNodeNames(workflow);
  const aiSubNodes = findAiSubNodeNames(workflow); // already exists

  return workflow.nodes.filter((node) => {
    if (node.disabled) return false;
    // AI sub-nodes are handled via their root — don't pin individually
    if (aiSubNodes.has(node.name)) return false;
    // AI root nodes (Agent, Chain) — pin to skip SDK calls
    if (aiRootNodes.has(node.name)) return true;
    // Protocol/bypass nodes
    if (BYPASS_NODE_TYPES.has(node.type)) return true;
    return false;
  });
}
```

**2d. Update `identifyNodesForHints()` to exclude pinned nodes.**

Nodes that will be pinned don't execute, so hints for them are irrelevant:

```typescript
export function identifyNodesForHints(workflow: IWorkflowBase): INode[] {
  const aiSubNodes = findAiSubNodeNames(workflow);
  const pinnedNodes = new Set(identifyNodesForPinData(workflow).map((n) => n.name));

  return workflow.nodes.filter((node) => {
    if (node.disabled) return false;
    if (aiSubNodes.has(node.name)) return false;
    if (pinnedNodes.has(node.name)) return false;
    return true;
  });
}
```

---

### Step 3: Add pin data generation (Phase 1.5)

**File: `packages/cli/src/modules/instance-ai/eval-execution.service.ts`**

**3a. Import `generatePinData` from instance-ai.**

```typescript
import { generatePinData } from '@n8n/instance-ai/evaluations/support/pin-data-generator';
```

Note: `generatePinData` expects `WorkflowJSON` (from `@n8n/workflow-sdk`) while the
CLI eval uses `IWorkflowBase` (from `n8n-workflow`). The shapes are structurally
compatible — cast with `as unknown as WorkflowJSON`.

**3b. Import `identifyNodesForPinData` from eval-workflow-analysis.**

```typescript
import {
  generateMockHints,
  identifyNodesForHints,
  identifyNodesForPinData,
  type MockHints,
} from './eval-workflow-analysis';
```

**3c. Add `generateBypassPinData()` private method.**

`generatePinData()` returns `PinData` (`Record<string, Array<Record<string, unknown>>>`)
where items are already `{ json: ... }` wrapped (see `parsePinDataResponse()` at
line 384-392 of `pin-data-generator.ts`). Use `normalizePinData()` from
`@n8n/workflow-sdk` to ensure the wrapper and cast to `IPinData`.

```typescript
import { normalizePinData } from '@n8n/workflow-sdk';

private async generateBypassPinData(
  workflowEntity: IWorkflowBase,
  bypassNodeNames: string[],
  globalContext: string,
): Promise<IPinData> {
  if (bypassNodeNames.length === 0) return {};

  const result = await generatePinData({
    workflow: workflowEntity as unknown as WorkflowJSON,
    nodeNames: bypassNodeNames,
    instructions: globalContext
      ? { dataDescription: globalContext }
      : undefined,
  });

  // generatePinData returns PinData (Record<string, Array<Record<string, unknown>>>)
  // where items are already { json: ... } wrapped. normalizePinData ensures the
  // wrapper is present and returns the correct IPinData type.
  return normalizePinData(result as unknown as IPinData);
}
```

**3d. Update `analyzeWorkflow()` to run Phase 1.5.**

After generating mock hints, identify bypass nodes and generate their pin data:

```typescript
private async analyzeWorkflow(
  workflowEntity: IWorkflowBase,
  scenarioHints?: string,
): Promise<MockHints> {
  // Phase 1: Generate mock hints (existing)
  const hintNodes = identifyNodesForHints(workflowEntity);
  const nodeNames = hintNodes.map((n) => n.name);
  // ... existing hint generation code ...
  const hints = await generateMockHints({ workflow: workflowEntity, nodeNames, scenarioHints });

  // Phase 1.5: Generate pin data for bypass nodes
  const bypassNodes = identifyNodesForPinData(workflowEntity);
  const bypassNodeNames = bypassNodes.map((n) => n.name);

  if (bypassNodeNames.length > 0) {
    this.logger.debug(
      `[EvalMock] Generating pin data for ${bypassNodeNames.length} bypass nodes: ${bypassNodeNames.join(', ')}`,
    );
    hints.bypassPinData = await this.generateBypassPinData(
      workflowEntity,
      bypassNodeNames,
      hints.globalContext,
    );
  } else {
    hints.bypassPinData = {};
  }

  return hints;
}
```

---

### Step 4: Merge pin data during execution

**File: `packages/cli/src/modules/instance-ai/eval-execution.service.ts`**

Update `execute()` to merge bypass pin data with trigger pin data and mark
pinned nodes in results.

In the `execute()` method, after building trigger pin data (~line 152):

```typescript
// Merge bypass pin data (Phase 1.5) with trigger pin data
const triggerPinData = this.buildTriggerPinData(startNode, hints.triggerContent);
const pinData: IPinData = { ...triggerPinData, ...hints.bypassPinData };
const pinDataNodeNames = Object.keys(pinData);

// Mark bypass nodes as pinned in results
for (const nodeName of Object.keys(hints.bypassPinData)) {
  const existing = nodeResults[nodeName];
  nodeResults[nodeName] = {
    output: null,
    interceptedRequests: [],
    executionMode: 'pinned',
    ...(existing?.configIssues ? { configIssues: existing.configIssues } : {}),
  };
}
```

The rest of `execute()` remains unchanged — `pinData` is passed to
`buildExecutionData()` which passes it to `WorkflowExecute.processRunExecutionData()`.

---

### Step 5: Update error result default

**File: `packages/cli/src/modules/instance-ai/eval-execution.service.ts`**

Update `errorResult()` to include the new field:

```typescript
private errorResult(executionId: string, message: string): InstanceAiEvalExecutionResult {
  return {
    executionId,
    success: false,
    nodeResults: {},
    errors: [message],
    hints: {
      globalContext: '',
      triggerContent: {},
      nodeHints: {},
      warnings: [],
      bypassPinData: {},
    },
  };
}
```

## Files Changed (Summary)

| File | Change | Size |
|------|--------|------|
| `packages/cli/src/modules/instance-ai/eval-workflow-analysis.ts` | Add `findAiRootNodeNames`, `BYPASS_NODE_TYPES`, `identifyNodesForPinData`, update `identifyNodesForHints`, extend `MockHints` | M |
| `packages/cli/src/modules/instance-ai/eval-execution.service.ts` | Add `generateBypassPinData`, update `analyzeWorkflow` (Phase 1.5), update `execute` to merge pin data, update `errorResult` | M |
| `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` | Add `bypassPinData` to `InstanceAiEvalMockHints` | XS |

## Key Dependencies

| Package | What we use |
|---------|-------------|
| `@n8n/instance-ai/evaluations/support/pin-data-generator.ts` | `generatePinData()` — LLM-based pin data generation with schema resolution |
| `@n8n/instance-ai/evaluations/types.ts` | `PinData`, `PinDataGenerationInstructions` types |
| `@n8n/workflow-sdk` | `WorkflowJSON`, `NodeJSON` types (for `generatePinData` input) |
| `@n8n/workflow-sdk` (pin-data-utils) | `normalizePinData()`, `discoverOutputSchemaForNode()`, `needsPinData()` — shared utilities added in `8b9de31d69` |

**NOTE:** `@n8n/workflow-sdk/src/pin-data-utils.ts` (from `8b9de31d69`) is now
available on this branch after the rebase. `normalizePinData()` is used in
`generateBypassPinData()` instead of manual `{ json: ... }` wrapping.

## Type Bridging

`generatePinData()` expects `WorkflowJSON` (from `@n8n/workflow-sdk`) while the
CLI eval service uses `IWorkflowBase` (from `n8n-workflow`). The shapes are
structurally compatible:

- Both have `nodes: Array<{ name, type, typeVersion, parameters, ... }>`
- Both have `connections: Record<string, ...>`

Cast at the call site: `workflowEntity as unknown as WorkflowJSON`

## What Stays Unchanged

- **HTTP mock handler** (`llm-mock-handler.ts`) — standard service nodes (Slack, Gmail, etc.)
  continue to be mock-executed via HTTP interception
- **Trigger pin data** — existing `buildTriggerPinData()` logic untouched
- **Mock credentials** (`eval-mock-helpers.ts`) — unchanged
- **Workflow execution** (`workflow-execute.ts`) — pin data skip behavior is already built in

## Verification

1. Build: `pnpm build > build.log 2>&1 && tail -20 build.log`
2. Typecheck: `pushd packages/cli && pnpm typecheck && popd`
3. Typecheck API types: `pushd packages/@n8n/api-types && pnpm typecheck && popd`
4. Test with a workflow containing an Agent + LLM sub-nodes → Agent should be pinned,
   no SDK credential errors
5. Test with a workflow containing Postgres/Redis → nodes should be pinned with
   realistic data
6. Test with a standard workflow (Slack, Gmail, GSheets) → behavior unchanged,
   nodes execute with HTTP mock handler
