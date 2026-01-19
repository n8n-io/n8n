# Implementation Plan: NodeChain Pattern

## Goal
Implement the NodeChain pattern to fix 25 skipped workflows in codegen roundtrip tests:
- 21 workflows with disconnected subgraphs / multiple triggers
- 4 workflows with multi-output nodes

## Current State
- `NodeChain` interface **exists** in `types/base.ts` (lines 297-322)
- `isNodeChain()` type guard **exists** (lines 327-334)
- **No runtime implementation** - `.then()` returns target `T`, not a chain
- `WorkflowBuilder.add()` doesn't accept chains
- Codegen can't emit `.add(chain)` syntax

## Implementation Steps

### Phase 1: NodeChain Runtime Implementation

#### Step 1.1: Create NodeChainImpl class in node-builder.ts
**File:** `src/node-builder.ts`

Add a new class that implements the `NodeChain` interface:
- Store `head` (first node), `tail` (last node), `allNodes` array
- Store connections array with `{from, to, outputIndex}`
- Implement `.then()` that returns a new chain with extended nodes/connections
- Implement `.onError()` for error output connections
- Proxy NodeInstance properties to `tail` for backward compatibility

#### Step 1.2: Modify NodeInstance.then() to return NodeChain
**File:** `src/node-builder.ts`

Change the `NodeInstanceImpl.then()` method:
```typescript
// Before: returns T (target)
then<T extends NodeInstance>(target: T, outputIndex: number = 0): T

// After: returns NodeChain<this, T>
then<T extends NodeInstance>(target: T, outputIndex: number = 0): NodeChain<this, T>
```

#### Step 1.3: Update types/base.ts NodeInstance.then() signature
**File:** `src/types/base.ts`

Update the interface to match the new return type (if not already updated).

### Phase 2: WorkflowBuilder Chain Support

#### Step 2.1: Update WorkflowBuilder.add() to accept NodeChain
**File:** `src/workflow-builder.ts`

Modify `add()` method:
```typescript
add<N extends NodeInstance | NodeChain>(nodeOrChain: N): WorkflowBuilder
```

When a chain is received:
1. Add all nodes from `chain.allNodes` using `addNodeWithSubnodes()`
2. Create all connections from `chain` internal connection list
3. Set `currentNode` to `chain.tail.name`

### Phase 3: Codegen Chain Emission

#### Step 3.1: Detect disconnected subgraphs in codegen.ts
**File:** `src/codegen.ts`

Modify the code generation to:
1. Group nodes by connected component (using graph traversal)
2. Identify multiple triggers / orphan chains
3. For each disconnected chain, emit `.add(trigger().then(nodeA).then(nodeB))` syntax

#### Step 3.2: Update generateChain() for inline chain syntax
**File:** `src/codegen.ts`

When generating code for a disconnected subgraph:
- Emit the entire chain inside `.add()` call
- Format: `.add(trigger().then(nodeA).then(nodeB))`

### Phase 4: Parser Chain Support

#### Step 4.1: Update parse-workflow-code.ts for chain parsing
**File:** `src/parse-workflow-code.ts`

The parser evaluates the code, so it should work automatically once:
- `NodeInstance.then()` returns a proper chain
- `WorkflowBuilder.add()` accepts chains

No explicit parsing changes needed - the evaluation approach handles this.

### Phase 5: Multi-Output Support (fixes 4 remaining workflows)

#### Step 5.1: Add .output() method to NodeChain
**File:** `src/node-builder.ts`

Add method to select specific output index for next connection:
```typescript
output(index: number): NodeChainOutputSelector<THead, TLast>
```

This enables:
```typescript
ifNode().output(0).then(trueHandler).output(1).then(falseHandler)
```

#### Step 5.2: Update codegen for multi-output patterns
**File:** `src/codegen.ts`

Detect multi-output patterns and emit `.output(index).then()` syntax.

### Phase 6: Testing & Cleanup

#### Step 6.1: Update existing tests
**File:** `src/__tests__/workflow-builder.test.ts`

Fix any tests broken by the API change from `.then()` returning target to returning chain.

#### Step 6.2: Remove fixed workflows from SKIP_WORKFLOWS
**File:** `src/__tests__/codegen-roundtrip.test.ts`

Remove the 21 disconnected subgraph workflows after Phase 1-4.
Remove the 4 multi-output workflows after Phase 5.

#### Step 6.3: Run full test suite and typecheck
```bash
cd packages/@n8n/workflow-sdk && pnpm test
pnpm typecheck
```

## Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `src/node-builder.ts` | 1 | Add NodeChainImpl, modify .then() return type |
| `src/types/base.ts` | 1 | Update NodeInstance.then() signature (if needed) |
| `src/workflow-builder.ts` | 2 | Update add() to accept NodeChain |
| `src/codegen.ts` | 3 | Emit chain syntax for disconnected subgraphs |
| `src/parse-workflow-code.ts` | 4 | Likely no changes (eval-based) |
| `src/__tests__/workflow-builder.test.ts` | 6 | Update for new .then() behavior |
| `src/__tests__/codegen-roundtrip.test.ts` | 6 | Remove SKIP_WORKFLOWS entries |

## Breaking Changes

The `.then()` return type changes from `T` to `NodeChain<this, T>`.

**Mitigation:** NodeChain proxies to `tail` for NodeInstance properties, so most code continues to work:
```typescript
// Before
const nodeB = triggerA().then(nodeB);
nodeB.type; // Works

// After
const chain = triggerA().then(nodeB);
chain.type; // Works (proxies to tail.type)
chain.tail.type; // Also works (explicit access)
```

## Verification Checklist
- [ ] All existing tests pass
- [ ] Typecheck passes
- [ ] 21 disconnected subgraph workflows pass roundtrip
- [ ] 4 multi-output workflows pass roundtrip
- [ ] SKIP_WORKFLOWS is empty
