# Try/Catch with Error Connections

The compiler supports three cases for `try { ... } catch { ... }`:

| Try body | Catch body | Strategy |
|----------|-----------|----------|
| 1 IO node | empty `catch {}` | Mark node with `onError: continueErrorOutput`, no error connection |
| 1 IO node | non-empty | Mark node with `onError: continueErrorOutput` + `.onError(catchChain)` |
| 2+ IO nodes | any | Wrap try body in `__tryCatch_N` sub-workflow, Execute Workflow node with `.onError(catchChain)` if catch non-empty |

## Error Connection Serialization (`main[1]` vs `error`)
- **`continueErrorOutput` nodes**: Error connections use `main` connection type at **output index 1** (not `error` connection type). This matches n8n's runtime expectation: success at `main[0]`, error at `main[1]`.
- **Regular error connections** (e.g., IfElseBuilder): Use `error` connection type at output index 0 (separate from `main`).
- **Builder's `.onError()`** (`node-builder.ts`): Automatically checks `config.onError === 'continueErrorOutput'` to determine which pattern to use.
- **Decompiler normalization**: `semantic-registry.ts:getOutputName()` normalizes `main[1]` -> `'error'` for `continueErrorOutput` nodes, so the decompiler sees a uniform representation.

## Compiler Side
- **`processTryStatement()`**: Three-way branching based on `countIOInBody()` and whether catch body has statements
- **Error connections**: `ctx.errorConnections` array tracks `{ sourceVar, catchChainStartVar }` pairs. Emitted as `sourceVar.onError(catchChainStartVar);` in `generateSDKCode()` after node declarations.
- **Catch nodes as branch-only**: Catch chain nodes marked `branchOnly: true` (same pattern as if/else branches) so they don't appear in the main `.to()` chain
- **Multi-node try body**: Compiled via `compileTryCatchBodyAsSubWorkflow()` -- same pattern as `compileLoopBodyAsSubWorkflow()`. Sub-workflow name `__tryCatch_N`, variable prefix `tc_tryCatch_N_`.
- **Variable capture**: `collectCapturedVariables()` walks try body AST for `Identifier` references present in `varSourceMap`. Captured vars passed via Set node before the Execute Workflow node.
- **Empty catch optimization**: When catch body is empty (any IO count), `onError: continueErrorOutput` is set but no error connection or catch chain is emitted.

## Decompiler Side
- **Single-node try with error handler**: `visitLeaf()` checks `leaf.errorHandler` + `onError === 'continueErrorOutput'`. Sets `ctx.suppressTryCatch = true` to prevent `emitHttpNode`/`emitAiNode` from adding their own `try/catch {}`, then wraps: `try { <node> } catch { <error handler> }`.
- **Multi-node try (`__tryCatch_` sub-workflow)**: `detectSubFunctions()` checks if inner workflow id starts with `__tryCatch_`. Decompiles inner workflow body, stores in `tryCatchBodies` map. `visitLeaf()` detects the exec node, emits `try { <decompiled body> } catch { <error handler> }`.
- **Set node skipping**: Set nodes for `__tryCatch_N` params are skipped via `isSubFunctionSetNode()` (same pattern as sub-function Set nodes).
- **`suppressTryCatch` flag**: Added to `SimplifiedGenContext`. When true, `emitHttpNode`/`emitAiNode` skip their own `try/catch` wrapping but still use assignment syntax (`x = await` instead of `const x = await`).

## Pre-existing try/catch (empty catch)
- **Variable name recovery**: `computeVariableAssignments()` checks the predecessor Code node for `let X = null;` and uses `X` as the variable name instead of the default `data`. This prevents duplicate declarations.
- **Code node awareness**: When `codeNodeVars.has(assignedVar)` is true, `emitHttpNode()`/`emitAiNode()` skip emitting `let X = null;` since the Code node already declares it.
- **`continueRegularOutput`** emits `// @onError continue` annotation (different pattern, no try/catch).
