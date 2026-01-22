# Investigate Codegen Simplification for LLM-Friendly Output

## Problem Statement

The current `codegen.ts` implementation has grown complex (~2500 lines) with many special cases. Despite 235 passing tests, 56 workflows still fail due to connection mismatches in complex patterns.

**However, the OUTPUT format is good for LLMs.** The chained style with semantic composites is exactly what we want:

```typescript
// GOOD - LLM understands this naturally
trigger()
  .then(processData)
  .then(ifBranch({
    condition: { field: 'status', op: 'eq', value: 'active' },
    trueBranch: sendEmail,
    falseBranch: logError
  }))
  .then(merge([branch1, branch2, branch3]))
  .then(finalNode)
```

**What we DON'T want** (confusing for LLMs):

```typescript
// BAD - Explicit indices are confusing
const node1 = node({...});
const node2 = node({...});
node1.connect(node2, { outputIndex: 0, inputIndex: 1 });
merge1.connectInput(node3, 2);  // What does 2 mean?
```

## Core Challenge

The codegen must transform a **flat graph with indices** (n8n JSON) into **semantic nested structures** (SDK code) that LLMs can understand and generate.

n8n JSON connections look like:
```json
{
  "Node A": { "main": [[{ "node": "IF", "index": 0 }]] },
  "IF": { "main": [
    [{ "node": "True Handler", "index": 0 }],  // output 0 = true
    [{ "node": "False Handler", "index": 0 }]  // output 1 = false
  ]}
}
```

SDK code should look like:
```typescript
nodeA.then(ifBranch({
  trueBranch: trueHandler,
  falseBranch: falseHandler
}))
```

**The complexity comes from reconstructing semantic meaning from indices.**

## Investigation Goals

Find a simpler way to generate LLM-friendly code that:

1. **Uses semantic composites** - `ifBranch()`, `switchCase()`, `merge()`, `splitInBatches()`
2. **Avoids explicit indices** - No `outputIndex: 1` or `inputIndex: 2`
3. **Handles all patterns** - Cycles, fan-out, convergence, nested branches
4. **Is maintainable** - Fewer special cases, clearer logic

## Proposed Approaches to Investigate

### Approach A: Graph Transformation Pipeline

Instead of one complex pass, transform the graph through stages:

```
Raw JSON Graph
    ↓
[1] Identify semantic structures (IF branches, merges, loops)
    ↓
Annotated Graph (nodes tagged with roles)
    ↓
[2] Group into composites
    ↓
Composite Tree (nested structure)
    ↓
[3] Generate code from tree
    ↓
LLM-friendly SDK code
```

**Benefits:**
- Each stage is simpler and testable
- Semantic meaning extracted once, used everywhere
- Easier to add new patterns

### Approach B: Pattern Templates

Define templates for each semantic pattern:

```typescript
const patterns = {
  ifBranch: {
    detect: (node) => node.type === 'n8n-nodes-base.if',
    getOutputs: (node, connections) => ({
      trueBranch: connections.main[0],  // output 0
      falseBranch: connections.main[1]  // output 1
    }),
    generate: (node, branches) =>
      `ifBranch({ trueBranch: ${branches.true}, falseBranch: ${branches.false} })`
  },

  merge: {
    detect: (node) => node.type === 'n8n-nodes-base.merge',
    getInputs: (node, reverseConns) =>
      reverseConns.sort((a, b) => a.inputIndex - b.inputIndex),
    generate: (node, inputs) =>
      `merge([${inputs.join(', ')}])`
  },

  splitInBatches: {
    detect: (node) => node.type === 'n8n-nodes-base.splitInBatches',
    getOutputs: (node, connections) => ({
      loop: connections.main[0],     // output 0 = loop body
      done: connections.main[1]      // output 1 = done
    }),
    generate: (node, branches) =>
      `splitInBatches({ loop: ${branches.loop}, done: ${branches.done} })`
  }
};
```

**Benefits:**
- Pattern-specific logic isolated
- Easy to add new node types
- Self-documenting

### Approach C: Semantic Node Registry

Create a registry that knows the semantic meaning of each node type's outputs/inputs:

```typescript
const nodeSemantics = {
  'n8n-nodes-base.if': {
    outputs: ['trueBranch', 'falseBranch'],
    composite: 'ifBranch'
  },
  'n8n-nodes-base.switch': {
    outputs: (node) => node.parameters.rules.map((_, i) => `case${i}`).concat(['fallback']),
    composite: 'switchCase'
  },
  'n8n-nodes-base.merge': {
    inputs: (node) => Array(node.parameters.numberInputs || 2).fill('branch'),
    composite: 'merge'
  },
  'n8n-nodes-base.splitInBatches': {
    outputs: ['loop', 'done'],
    composite: 'splitInBatches',
    cycleOutput: 'loop'  // marks which output creates cycles
  }
};
```

Then codegen uses this registry to understand structure without hardcoded logic.

## Key Patterns to Handle

### 1. IF Node (2 semantic outputs)
```
       ┌→ [true branch] → ...
[IF] ──┤
       └→ [false branch] → ...
```
**Output**: `ifBranch({ trueBranch: ..., falseBranch: ... })`

### 2. Switch Node (N semantic outputs)
```
          ┌→ [case 0] → ...
[Switch] ─┼→ [case 1] → ...
          └→ [fallback] → ...
```
**Output**: `switchCase({ cases: [...], fallback: ... })`

### 3. Merge Node (N semantic inputs)
```
[branch 0] ─┐
[branch 1] ─┼→ [Merge] → ...
[branch 2] ─┘
```
**Output**: `merge([branch0, branch1, branch2])`

### 4. SplitInBatches (loop + done)
```
              ┌→ [loop body] ──┐
[SplitInBatches] ←─────────────┘ (cycle back)
              └→ [done] → ...
```
**Output**: `splitInBatches({ loop: ..., done: ... })`

### 5. Nested Patterns
```
[Trigger] → [IF] ─┬→ [Merge A] ─┐
                  └→ [Merge A] ─┼→ [Merge B] → [Final]
                  [Other] ──────┘
```
**Output**: Nested composites that read naturally

## Investigation Tasks

### 1. Catalog All Multi-Output/Input Nodes

```bash
# Find all node types in test fixtures
cat test-fixtures/real-workflows/*.json | jq -r '.nodes[].type' | sort | uniq -c | sort -rn

# Find nodes with multiple outputs used
cat test-fixtures/real-workflows/*.json | jq -r '
  .connections | to_entries[] |
  select(.value.main | length > 1) |
  .key
' | sort | uniq
```

Document semantic meaning of each output for LLM understanding.

### 2. Analyze Failing Workflows

For each failing workflow, identify:
- Which semantic pattern is broken?
- What index information is being lost?
- What should the ideal output look like?

```bash
npx ts-node scripts/debug_merge.ts 3790
# Then manually write what ideal output should be
```

### 3. Prototype Semantic Extraction

Create `src/semantic-graph.ts`:

```typescript
interface SemanticNode {
  name: string;
  type: string;
  // Semantic output names instead of indices
  outputs: Map<string, SemanticNode[]>;  // 'trueBranch' → [nodes]
  // Semantic input slots instead of indices
  inputSlot?: string;  // 'branch0', 'branch1' for merge inputs
}

function buildSemanticGraph(json: WorkflowJSON): SemanticNode[] {
  // Transform index-based connections to semantic connections
}
```

### 4. Prototype Code Generator

Create `src/codegen-v2.ts` that generates from semantic graph:

```typescript
function generateFromSemantic(graph: SemanticNode[]): string {
  // Much simpler - no index juggling
  // Just walk the semantic structure and emit composites
}
```

### 5. Test Against Problem Workflows

Compare outputs:
- Current codegen output
- New codegen output
- Manual "ideal" output for LLM understanding

## Success Criteria

1. **Same or better LLM readability** - Output uses semantic composites, not indices
2. **Simpler implementation** - Significantly fewer lines, clearer logic
3. **More patterns working** - Fixes currently failing workflows
4. **Extensible** - Easy to add new node types with semantic outputs

## Questions to Answer

1. **Can we fully hide indices?** Or do some patterns require them?

2. **How do we handle unknown node types?** Fall back to generic `.then()`?

3. **What about nodes with dynamic outputs?** (e.g., Switch with variable cases)

4. **Can we make composites nestable cleanly?** `merge([ifBranch(...), switchCase(...)])`

5. **How do cycles interact with composites?** SplitInBatches loop-back needs special handling

## Files to Study

- `src/codegen.ts` - Current implementation complexity
- `src/types/sdk-api.ts` - Current composite interfaces
- `src/if-branch.ts`, `src/switch-case.ts`, `src/merge.ts` - Composite implementations
- `test-fixtures/real-workflows/*.json` - Real patterns to support

## Output

Document findings in `CODEGEN_SIMPLIFICATION_FINDINGS.md`:

1. **Semantic catalog** - All node types with semantic output/input meanings
2. **Pattern analysis** - How each semantic pattern should generate
3. **Prototype results** - What worked, what didn't
4. **Recommendation** - Chosen approach with implementation plan
5. **LLM examples** - Before/after showing improved readability

