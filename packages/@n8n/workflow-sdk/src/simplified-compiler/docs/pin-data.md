# Pin Data via `@example` JSDoc Annotation

Pin data provides mock/test output data for nodes, allowing workflows to run without real API calls. The DSL uses `/** @example */` JSDoc annotations to attach pin data to IO calls and trigger nodes.

## DSL Syntax

```javascript
// IO call pin data (mock output)
/** @example [{ id: 1, name: 'Alice' }] */
const users = await http.get('https://api.example.com/users');

// Trigger pin data (mock input -- webhook body, manual trigger output)
/** @example [{ body: { orderId: 123 } }] */
onWebhook({ method: 'POST', path: '/orders' }, async ({ body }) => { ... });

/** @example [{ triggered: true }] */
onManual(async () => { ... });

// Schedule triggers do NOT get @example (they just start the workflow)
onSchedule({ every: '1h' }, async () => { ... });
```

## Compiler Side (`compiler.ts`)

**IO call pin data** (via `walkStatements()`):
- **`pendingPinData`** in `TranspilerContext`: stores parsed pin data from the most recent `@example` annotation
- **JSDoc parsing** in `walkStatements()`: scans block comments (`type === 'Block'`) preceding each statement for `@example` tag. Uses `parseExampleAnnotation()` to strip JSDoc `*` prefixes, normalize relaxed JS syntax (unquoted keys, single-quoted values) to valid JSON, then `JSON.parse()`
- **Annotation attachment**: `pendingPinData` is applied to the next IO call and then cleared. If a non-IO statement intervenes, `pendingPinData` is cleared (annotation only attaches to the immediately following IO call)
- **SDK emission**: `generateHttpSDK()` and `generateAiSDK()` emit `pinData` in the node config when present
- **Relaxed JSON**: `parseExampleAnnotation()` handles unquoted keys (`{ id: 1 }` -> `{ "id": 1 }`) and single-quoted strings (`'Alice'` -> `"Alice"`). Malformed JSON is silently ignored (no compiler error).

**Trigger pin data** (via `findCallbacks()`):
- **`pinData`** field on `CallbackInfo`: stores parsed `@example` data for the trigger
- **Comment scanning**: `findCallbacks()` accepts `comments` and `consumedComments` parameters. Before each callback statement, scans for `@example` in block comments between previous top-level statement end and current statement start (prevents consuming comments inside function bodies)
- **Schedule exclusion**: `@example` before `onSchedule()` is silently ignored (schedule triggers just start the workflow)
- **SDK emission**: `generateTriggerSDK()` includes `pinData` in the trigger config alongside `parameters`
- **Comment sharing**: `consumedComments` Set is created in `transpileWorkflowJS()` and shared between `findCallbacks()` and `transpileCallback()` to prevent double-consumption of the same comment

## Decompiler Side (`simplified-generator.ts`)
- **`workflowPinData`** in `SimplifiedGenContext`: populated from `_json.pinData ?? {}` (workflow-level pin data keyed by node name)
- **IO node emission**: `emitHttpNode()` and `emitAiNode()` check `ctx.workflowPinData[node.name]` and emit `/** @example ... */` before the IO call
- **Trigger emission**: `emitTriggerHeader()` checks `ctx.workflowPinData[node.name]` for non-schedule triggers and emits `/** @example ... */` before the trigger header

## Workflow-Level Pin Data Flow
In workflow JSON, `pinData` is at the top level keyed by node name: `{ pinData: { "GET api.example.com/users": [{ id: 1 }] } }`. The SDK builder's `NodeConfig.pinData` gets collected into this map during `toJSON()` via `collectPinData()`.

## Top-Level Comment Scoping
**Gotcha**: Acorn stores ALL comments in a flat array regardless of nesting scope. A comment inside a function body (e.g., `@example` inside `async function checkBlurays()`) has a position that is before the `onManual()` callback. Without scoping, `findCallbacks()` would incorrectly consume it. Fixed by tracking `prevStmtEnd` -- only comments starting after the previous top-level statement's end are considered for the current callback.
