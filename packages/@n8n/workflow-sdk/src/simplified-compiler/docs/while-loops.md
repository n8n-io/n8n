# While / Do-While Loops

## Overview

`while` and `do-while` loops with IO calls (http, ai, workflow) compile to IF nodes (`While N`) with cyclic back-edge connections. Loops without IO stay as plain JS inside Code nodes (same as for-of without IO).

## Compiler

### While (condition-first)

```javascript
while (cursor) {
  const page = await http.get('https://api.example.com?cursor=' + cursor);
  cursor = page.nextCursor;
}
```

Compiles to:
1. **IF node** (`While N`) — evaluates condition, emitted first
2. **Body nodes** — compiled as true branch (output index 0) via `transpileBranch()`
3. **Back-edge** — last body node connects back to IF: `code1.to(while1);`
4. **Exit** — IF false output (index 1) connects to first post-loop node

### Do-While (body-first)

```javascript
do {
  const status = await http.get('https://api.example.com/health');
} while (status.statusCode !== 200);
```

Compiles to:
1. **Body nodes** — walked inline in parent context (not branched)
2. **IF node** (`While N`) — emitted after body, evaluates condition
3. **Back-edge** — IF true output connects to first body node: `while1.to(http1, 0);`
4. **Exit** — IF false output (index 1) connects to first post-loop node

### Key data structure: `WhileLoopGroup`

```typescript
interface WhileLoopGroup {
  ifVar: string;          // e.g. 'while1'
  ifNodeName: string;     // e.g. 'While 1'
  backEdgeTarget?: string;   // do-while: first body node var
  backEdgeSource?: string;   // while: last body node var
  backEdgeOutputIndex: number;
  isDoWhile: boolean;
  exitTarget?: string;       // first post-loop node (set during chain splitting)
}
```

### Chain splitting

While IF nodes act as chain boundaries (like parallel groups). The main `.add()` chain is split at while IF var positions. Post-loop nodes start a new chain segment. The exit connection (`while1.to(postLoopNode, 1)`) is emitted as a standalone statement in `generateSDKCode()`.

### No-IO fallback

If `findNestedIO()` finds no IO calls in the loop body, the entire while/do-while is kept as plain JS inside a Code node — no IF node or back-edges are generated.

## Decompiler

### Cycle detection (`isWhileLoopPattern`)

In `composite-builder.ts`, before building a standard ifElse composite, the builder checks if the IF node matches a while-loop pattern:
- Node name starts with `'While '`
- **Do-while**: outgoing edges from true branch target a node already seen (cycle)
- **While**: the IF node itself is a cycle target (`isCycleTarget` flag)

### Composite tree type

```typescript
interface WhileLoopCompositeNode {
  kind: 'whileLoop';
  ifNode: SemanticNode;
  bodyChain: CompositeNode | null;  // null for do-while (body in parent chain)
  isDoWhile: boolean;
}
```

### Code generation (`visitWhileLoop`)

In `simplified-generator.ts`:
- **While**: emits `while (condition) { <bodyChain> }`
- **Do-while**: body nodes are already in the parent chain before the whileLoop composite. `detectDoWhilePattern()` looks ahead from a cycle-target leaf node, finds the upcoming whileLoop composite, and wraps the body nodes in `do { ... } while (condition);`

### Condition reconstruction

Uses the same `conditionsToSimplifiedCondition()` as if/else — reconstructs the JS condition expression from n8n's conditions parameter format.

## Fixtures

| Fixture | Pattern |
|---------|---------|
| `w33-do-while-poll` | Do-while: poll until HTTP returns 200 |
| `w34-while-cursor` | While: cursor-based pagination with dynamic URL |

## Edge cases

- **Complex conditions** (`&&`, `||`): work via `buildIfConditionsParam()` which already handles logical operators
- **Nested while in code**: no-IO while inside a callback stays as plain JS
- **Variable tracking**: loop body variables are tracked in `varSourceMap` for expression resolution in the condition and post-loop code
