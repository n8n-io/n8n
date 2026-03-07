# W25/W26/W27 Round-Trip Fixes

## W25: CRUD + Branching + Error Handling
Two bugs prevented round-trip:
1. **Builder instance identity** (`workflow-builder.ts`): `addConnectionTargetNodes` and `addSingleNodeConnectionTargets` used `!nodes.has(targetNode.name)` to guard against adding duplicate nodes. With multiple nodes sharing the same name (e.g., 6x "POST httpbin.org/post"), different instances were incorrectly skipped. Fixed with `isInstanceInGraph()` which checks by instance reference (`===`), not by name.
2. **Switch case operator types** (`simplified-generator.ts`): `visitSwitchCase` always wrapped case values in quotes (`'true'`), making them string literals. When the operator type is `boolean` or `number`, values must be emitted without quotes to preserve type during round-trip.

## W26: Loop with Sub-Function
**Sub-function calls in loops counted as "0 IO"**: `processForOfStatement` only counted direct IO calls (`http.*`, `ai.*`). A sub-function call (`await enrichUser(...)`) was invisible, causing the loop body to be inlined as opaque JS in a Code node. The decompiler can't reconstruct function calls from opaque Code node `jsCode`. Fixed by adding `loopBodyHasFunctionCall()` / `countFunctionCallsInBody()` and treating function calls as effective IO. Also ensured Set/ExecuteWorkflow nodes respect `ctx.inLoopBody` to skip `executeOnce`.

## W27: Loop with Try/Catch
**Error connections lost in sub-workflow**: `compileLoopBodyAsSubWorkflow()` creates a local `errorConnections: []` context. Error connections pushed during `processTryStatement` were trapped in the local context and never returned. Fixed by propagating `errorConnections` through `CompiledFunction` interface and emitting them in `generateSDKCode()`.
