# Analysis: SKIP_WORKFLOWS Edge Cases in Codegen Roundtrip Tests

## Problem Summary

The `codegen-roundtrip.test.ts` skips 25 workflows that fail the roundtrip test:
- **21 workflows**: Disconnected subgraphs / multiple triggers
- **4 workflows**: Multi-output nodes not handled by composites

---

## Root Cause Analysis

### Current NodeInstance.then() Behavior

```typescript
// node-builder.ts:88-91
then<T extends NodeInstance>(target: T, outputIndex: number = 0): T {
  this._connections.push({ target, outputIndex });
  return target;  // Returns TARGET, not source
}
```

**The fundamental problem:**
```typescript
// User's suggested pattern:
workflow.add(triggerA().then(nodeB)).add(triggerB().then(nodeC))

// What happens:
// 1. triggerA().then(nodeB) → stores connection in triggerA, returns nodeB
// 2. workflow.add(nodeB) → adds nodeB, but triggerA is LOST!
```

The current `.then()` returns the target node, losing the source. For the user's pattern to work, `.add()` needs access to all nodes in the chain.

---

## Recommended Solution: NodeChain Pattern

### Concept
Create a `NodeChain` type that `.then()` returns, containing all nodes in the chain. The `WorkflowBuilder.add()` method accepts either a `NodeInstance` or a `NodeChain`.

### API Design
```typescript
// User's desired pattern works:
workflow('id', 'name')
  .add(triggerA().then(nodeB))           // Chain 1: triggerA → nodeB
  .add(triggerB().then(nodeC).then(nodeD))  // Chain 2: triggerB → nodeC → nodeD
```

### Implementation

#### 1. New `NodeChain` type (`types/base.ts`)
```typescript
export interface NodeChain<THead extends NodeInstance = NodeInstance, TLast extends NodeInstance = NodeInstance> {
  readonly _isChain: true;
  readonly head: THead;        // First node (usually trigger)
  readonly tail: TLast;        // Last node (for type inference)
  readonly nodes: NodeInstance[];  // All nodes in order
  readonly connections: Array<{from: string, to: string, outputIndex: number}>;

  // Continue the chain
  then<T extends NodeInstance>(target: T, outputIndex?: number): NodeChain<THead, T>;
}
```

#### 2. Modify `NodeInstance.then()` to return `NodeChain`
```typescript
// node-builder.ts - Change return type
then<T extends NodeInstance>(target: T, outputIndex: number = 0): NodeChain<this, T> {
  // Return a chain containing [this, target] with connection info
  return createChain(this, target, outputIndex);
}
```

**Note:** This is a breaking change. Alternative: add a new method like `.chain()` while keeping `.then()` unchanged for backward compatibility.

#### 3. Update `WorkflowBuilder.add()` to accept chains
```typescript
// workflow-builder.ts
add<N extends NodeInstance | NodeChain>(nodeOrChain: N): WorkflowBuilder {
  if (isNodeChain(nodeOrChain)) {
    // Add all nodes from chain
    for (const node of nodeOrChain.nodes) {
      this.addNodeWithSubnodes(newNodes, node);
    }
    // Add all connections
    for (const conn of nodeOrChain.connections) {
      // ... create connections
    }
    return this.clone({ currentNode: nodeOrChain.tail.name });
  }
  // ... existing single node logic
}
```

#### 4. Update codegen to emit chain syntax
```typescript
// codegen.ts - For disconnected subgraphs
// Emit: .add(trigger1().then(nodeA).then(nodeB))
// Instead of: .add(trigger1).then(nodeA).then(nodeB)
```

---

## Implementation Plan

### Phase 1: NodeChain Type & API Change (fixes 21 disconnected subgraph workflows)

#### Step 1.1: Add `NodeChain` interface to `types/base.ts`
```typescript
export interface NodeChain<THead extends NodeInstance = NodeInstance, TLast extends NodeInstance = NodeInstance> {
  readonly _isChain: true;
  readonly head: THead;
  readonly tail: TLast;
  readonly nodes: NodeInstance[];
  readonly connections: Array<{from: string, to: string, outputIndex: number}>;
  then<T extends NodeInstance>(target: T, outputIndex?: number): NodeChain<THead, T>;
}
```

#### Step 1.2: Modify `NodeInstance.then()` in `node-builder.ts`
- Change return type from `T` to `NodeChain<this, T>`
- Implement `NodeChainImpl` class
- Update existing `.then()` to return chain

```typescript
// Before:
then<T extends NodeInstance>(target: T, outputIndex: number = 0): T {
  this._connections.push({ target, outputIndex });
  return target;
}

// After:
then<T extends NodeInstance>(target: T, outputIndex: number = 0): NodeChain<this, T> {
  return new NodeChainImpl(this, target, outputIndex);
}
```

#### Step 1.3: Update `WorkflowBuilder.add()` in `workflow-builder.ts`
- Accept `NodeInstance | NodeChain`
- When chain received, add all nodes and create all connections
- Set `currentNode` to chain's tail

#### Step 1.4: Update `codegen.ts`
- Detect disconnected subgraphs (multiple triggers, orphan chains)
- Emit chain syntax: `.add(trigger1().then(nodeA).then(nodeB))`
- Each disconnected chain becomes a separate `.add()` call

#### Step 1.5: Update `parse-workflow-code.ts`
- Parse chained `.then()` calls within `.add()`
- Reconstruct connections from chain structure

#### Step 1.6: Update tests
- Fix any broken tests from API change
- Remove 21 workflows from `SKIP_WORKFLOWS`

### Phase 2: Multi-Output Support (fixes 4 remaining workflows)

#### Step 2.1: Add `.output(index)` to `NodeChain`
```typescript
// Enable branching within chains:
node({ type: 'n8n-nodes-base.if', ... })
  .output(0).then(trueHandler)
  .output(1).then(falseHandler)
```

#### Step 2.2: Update codegen for multi-output
- Detect multi-output patterns
- Emit `.output(index).then()` syntax

#### Step 2.3: Update parser for multi-output
- Parse `.output()` calls
- Reconstruct connections with correct output indices

#### Step 2.4: Remove remaining 4 workflows from `SKIP_WORKFLOWS`

---

## Files to Modify

| File | Changes |
|------|---------|
| `types/base.ts` | Add `NodeChain` interface, update `NodeInstance.then()` signature |
| `node-builder.ts` | Implement `NodeChainImpl`, modify `.then()` return type |
| `workflow-builder.ts` | Update `add()` to accept `NodeChain`, handle chain unwrapping |
| `codegen.ts` | Emit chain syntax for disconnected subgraphs |
| `parse-workflow-code.ts` | Parse chained `.then()` within `.add()` |
| `index.ts` | No changes needed (types auto-export) |
| `codegen-roundtrip.test.ts` | Remove fixed workflows from SKIP_WORKFLOWS |
| `workflow-builder.test.ts` | Update tests for new `.then()` behavior |

---

## Breaking Changes

This is a **breaking change** to the API:

**Before:**
```typescript
const nodeB = triggerA().then(nodeB);  // returns NodeInstance
nodeB.type; // Works
```

**After:**
```typescript
const chain = triggerA().then(nodeB);  // returns NodeChain
chain.tail.type; // Access last node via .tail
chain.nodes[1].type; // Or via index
```

Existing code using `.then()` on `WorkflowBuilder` is **unaffected** - only `NodeInstance.then()` changes.

---

## Verification

1. `cd packages/@n8n/workflow-sdk && pnpm test` - Run all tests
2. `pnpm typecheck` - Verify type safety
3. Check all 25 previously skipped workflows pass roundtrip
4. Review any breaking changes in dependent code
