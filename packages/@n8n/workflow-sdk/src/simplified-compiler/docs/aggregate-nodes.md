# Aggregate Code Node Architecture

After every HTTP call with an assigned variable, the compiler emits an aggregate Code node that collects all items into a single value. This solves the "multi-item HTTP response" problem where `GET /todos` returns 200 items but downstream `.first().json` only sees the first.

## Aggregate Code Node Pattern

```js
// Generated jsCode for `const todos = await http.get('.../todos')`
// @aggregate: todos
const _raw = $('GET jsonplaceholder.typicode.com/todos').all().map(i => i.json);
const todos = _raw.length === 1 ? _raw[0] : _raw;
return [{ json: { todos } }];
```

- **1 item** (single object response): `_raw = [{name:"Alice"}]` → `todos = {name:"Alice"}` → `todos.name` works
- **200 items** (array response): `_raw = [{id:1}, ...]` → `todos = [{id:1}, ...]` → `todos.filter()` works

## Why `// @aggregate:` marker

The `// @aggregate: <varName>` comment in jsCode is the decompiler's detection mechanism. It serves two purposes:

1. **Detection** — distinguishes aggregate Code nodes from user-written Code nodes (both are `n8n-nodes-base.code` type)
2. **Variable name extraction** — `// @aggregate: todos` reliably gives us `todos`, even when node names get deduped by n8n (`Collect todos 2`)

Alternatives considered: node name convention (`Collect *`), jsCode pattern matching, graph position. The marker is simplest and most reliable because node names are subject to deduplication and jsCode patterns could match user code.

## Compiler Side (`compiler.ts`)

- **`emitAggregateNode()`**: Creates the aggregate Code node with `// @aggregate: <varName>` marker, `mode: 'runOnceForAllItems'`, and `executeOnce: true`
- **`processIOCall()`**: After emitting HTTP node, if `assignedVar` exists, calls `emitAggregateNode()`. Variable maps to aggregate with `kind: 'aggregate'`
- **`aggCounter`** in `TranspilerContext`: tracks aggregate node numbering (SDK var `agg1`, `agg2`, etc.)
- **Node naming**: `Collect <varName>` (or `Collect <varName> <N>` for dedup)
- **Expression resolution**: `'aggregate'` kind behaves like `'code'` — keeps full chain: `$('Collect todos').first().json.todos.prop`
- **Code node imports**: `'aggregate'` kind uses `.first().json.<varName>` (not `.all().map()`)
- **Error connections**: When a try/catch wraps an HTTP+aggregate, the `.onError()` connection is placed on the HTTP node (the one with `onError: continueErrorOutput`), not the aggregate

## Decompiler Side (`simplified-generator.ts`)

- **Detection**: `jsCode.startsWith('// @aggregate:')` identifies aggregate Code nodes
- **`emitCodeNode()`**: Skips aggregate nodes (returns immediately)
- **`computeVariableAssignments()`**: Extracts variable name from `// @aggregate: <varName>` marker, maps both aggregate node AND its predecessor HTTP node (via graph connections) to that variable name
- **Import regex**: Updated to match `.first().json.<prop>` pattern (e.g., `$('Collect todos').first().json.todos`)
- **`collectCodeNodeVars()`**: Skips aggregate Code nodes to avoid polluting the code node variable set

## Key Gotchas

- **Duplicate HTTP node names in sub-workflows**: The aggregate jsCode references `$('HTTP Node Name')` which may be ambiguous when multiple HTTP nodes share a name. The decompiler uses graph connections (`node.inputSources`) instead of jsCode parsing to find the predecessor HTTP node — this correctly handles duplicate names.
- **HTTP without assigned var**: No aggregate emitted (`await http.post(...)` with no `const x =`)
- **1-element array trade-off**: A 1-element array `[{id:1}]` unwraps to `{id:1}` — acceptable since single-element arrays are rare as intentional API responses
