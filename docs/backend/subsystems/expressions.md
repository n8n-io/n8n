---
title: Expressions
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: despairblue
---

# Expressions

Read this when you touch how `={{ $json.email }}` becomes a value, the `$` globals, the data transformation functions, or the isolated expression engine.

## What it is

An **expression** is a node parameter string that starts with `=`. It contains `{{ }}` JavaScript snippets that read workflow data. `n8n-workflow` parses and evaluates them.

Three parts do the work. `WorkflowDataProxy` builds the object that the snippet sees: `$json`, `$input`, `$('Node')`, `$now`, and the other `$` globals. The **extensions** layer adds n8n's data transformation functions, such as `.toDateTime()`, and `extendSyntax` rewrites calls to them. `Expression` then renders the snippet through an **engine**.

The default backend engine is `vm`, from `@n8n/expression-runtime`. It runs each snippet in a V8 isolate with a memory limit and a timeout. The `legacy` engine runs snippets in process through `@n8n/tournament`. `quickjs` is an experimental WASM sandbox.

## Why it has this shape

**Evaluation is lazy.** Nothing runs until a node calls `getNodeParameter` for a given item. The proxy is built for the current node, run index, and item index. This is why one parameter can give a different value for each item.

**Isolation moved out of process.** The legacy path blocks dangerous globals and AST patterns inside the n8n process. Keeping that sandbox tight took repeated patches. Therefore n8n moved to a separate V8 isolate, and `vm` became the default in August 2026.

**The isolate reads data lazily.** The runtime bundle uses deep lazy proxies. `$json.user.email` fetches only that path from the host, not the whole item. Calls such as `$('Node').first()` travel as typed RPC to the host.

**Isolates come from a pool.** Building an isolate is slow, so each backend process keeps a warm pool. `WorkflowExecute` acquires an isolate when a run starts and releases it at the end. Activation, polling, and webhooks acquire their own. A webhook whose fields contain no expression can skip the isolate.

**The browser runs a different engine.** `isolated-vm` is a native module and does not run in a browser. The editor uses `legacy` by default, or `quickjs` when `N8N_EXPRESSION_ENGINE_FRONTEND` selects it.

**Extension functions exist twice.** One copy is in `packages/workflow/src/extensions/` for the legacy path. A second copy is bundled into the isolate. A change to one needs the same change in the other.

**Start-up fails early.** `BaseCommand.init` calls `Expression.initExpressionEngine`. If `isolated-vm` is broken, the process exits with a clear message instead of a fallback.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Engine choice and rendering | `packages/workflow/src/expression.ts` | `Expression.initExpressionEngine` |
| The `$` globals, paired items | `packages/workflow/src/workflow-data-proxy.ts` | `WorkflowDataProxy` |
| `$vars`, `$secrets`, `$execution` | `packages/core/src/execution-engine/node-execution-context/utils/get-additional-keys.ts` | `getAdditionalKeys` |
| Legacy sandbox hooks | `packages/workflow/src/expression-sandboxing.ts` | `sanitizer` |
| Extension rewriting | `packages/workflow/src/extensions/expression-extension.ts` | `extendSyntax` |
| VM evaluator | `packages/@n8n/expression-runtime/src/evaluator/expression-evaluator.ts` | `ExpressionEvaluator` |
| V8 isolate bridge | `packages/@n8n/expression-runtime/src/bridge/isolated-vm-bridge.ts` | `IsolatedVmBridge` |
| Engine settings | `packages/@n8n/config/src/configs/expression-engine.config.ts` | `ExpressionEngineConfig` |

## What is moving

- The config comment calls `legacy` "soon to be deprecated".
- Experimental **native evaluation** interprets a closed subset of simple expressions directly, without an isolate. It sits in `packages/workflow/src/expressions/native-evaluation/` behind `N8N_EXPRESSION_ENGINE_NATIVE_EVALUATION`, off by default.
- Lazy isolate acquisition and a compile cache for the runtime bundle are also experimental and off by default.

## Read more

- `packages/@n8n/expression-runtime/ARCHITECTURE.md` and `README.md`
- `packages/@n8n/expression-runtime/docs/deep-lazy-proxy.md`
- `packages/@n8n/tournament/README.md`
- [Legacy and new](../legacy-and-new.md#expressions)
- docs.n8n.io: expressions, built-in variables, and data transformation functions
