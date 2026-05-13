# QuickJS Browser Bridge — Design

**Status:** Approved POC
**Date:** 2026-05-06
**Author:** despairblue (brainstormed with Claude)

## Goal

Run the existing `QuickJsBridge` in the browser to evaluate workflow expressions
in editor-ui, replacing the legacy engine for preview and autocomplete use.

This is **Phase 1 of a larger migration** whose end state is removing the
legacy expression engine entirely from the codebase. This spec covers only
making the bridge browser-compatible and wiring it into editor-ui. Switching
the backend default and removing legacy are separate later phases.

## Motivation

1. **Eliminate dual-path maintenance.** The legacy engine is woven through
   `expression.ts`, `expression-evaluator-proxy.ts`, Tournament integration,
   tests, and config. Owning two evaluation paths has ongoing cost.

2. **API confinement.** The legacy engine runs expressions in the main
   browser JS context. Tournament's denylist prevents direct access to
   `document`, `window`, `localStorage`, Pinia stores, etc. via AST
   sanitization — but that's best-effort shadowing, not isolation. In a
   QuickJS sandbox those globals don't exist at all. This matters even for
   self-authored expressions (pasted snippets, imported workflows,
   compromised extensions injecting expression text).

## Non-goals

- Web Worker isolation. The WASM sandbox is the isolation boundary; a Worker
  would add OS-process isolation but solves no real threat in this trust
  model. Revisit only if memory containment or main-thread blocking becomes
  a real problem.
- Lazy data loading via `SharedArrayBuffer` + `Atomics.wait`. Not needed for
  preview/autocomplete data sizes.
- Performance parity with legacy. QuickJS is ~25–30× slower than legacy for
  typical patterns but still sub-millisecond per eval on small data.
  Acceptable for preview/autocomplete.

## Trust model

- Expressions are always authored by the workflow creator.
- Threat is data exfiltration via expressions, not RCE: cookies, localStorage,
  Vue stores must remain unreachable from expression code.
- WASM sandbox satisfies this: the QuickJS guest has no DOM, no fetch, no
  `localStorage`, no host globals — only the runtime bundle and explicitly
  passed workflow data.

## Architecture

```
editor-ui (browser)
  ↓ imports
@n8n/expression-runtime
  ├── QuickJsBridge (existing, modified to accept runtimeBundle string)
  ├── Runtime IIFE bundle (existing, exposed via package export for ?raw import)
  └── quickjs-emscripten WASM (dynamic import on first eval)
```

The bridge and runtime bundle are unchanged behaviorally. The new wiring is
how the bundle gets into the bridge: instead of reading from disk via
`node:fs`, the browser passes it as a pre-loaded string from a `?raw` import.

## Components

| Component | Location | Change |
|---|---|---|
| `QuickJsBridge` | `@n8n/expression-runtime/src/bridge/quickjs-bridge.ts` | Add optional `runtimeBundle: string` to `BridgeConfig`. If provided, use it; otherwise fall back to existing filesystem walk. |
| `readRuntimeBundle` helper | `@n8n/expression-runtime/src/bridge/quickjs-bridge.ts` | Only invoked when `runtimeBundle` isn't supplied. Browser bundlers tree-shake `node:fs` / `node:path` out via dynamic-import boundary. |
| Runtime bundle package export | `@n8n/expression-runtime/package.json` `exports` field | New entry mapping `./runtime-bundle.iife.js` → `dist/bundle/runtime.iife.js` so vite can `?raw` it. |
| Frontend evaluator setup | `editor-ui` (entry point where `Expression.initExpressionEngine` is called) | New. Imports bundle as string, passes through `initExpressionEngine` → bridge factory. |
| `Expression.initExpressionEngine` | `packages/workflow/src/expression.ts` | Drop the `IS_FRONTEND` short-circuit for `engine: 'quickjs'`. Accept and forward `runtimeBundle` option. |

## Data flow

### Initialization (per editor session)

```
editor-ui startup
  → import runtimeBundle from '@n8n/expression-runtime/runtime-bundle.iife.js?raw'
  → Expression.initExpressionEngine({ engine: 'quickjs', runtimeBundle, … })
  → factory creates QuickJsBridge({ …, runtimeBundle })
  → on first .initialize(): dynamic import('quickjs-emscripten'),
    instantiate WASM, evalCode(runtimeBundle)
  → ready
```

### Per expression evaluation

Unchanged from the existing Node QuickJS bridge. Lazy proxy in the runtime
bundle calls host functions registered via `vm.newFunction` through the
adapter shims. Workflow data lives on the main JS thread; QuickJS reaches
into it synchronously via the shims. No new serialization boundary.

## Error handling

- **Missing/invalid `runtimeBundle`** → throw on `initialize()` with a clear
  message. No silent fallback to legacy.
- **`import('quickjs-emscripten')` fails** (network, chunk load) → propagate
  as init error.
- **WASM instantiation fails** → propagate as init error. Ancient browsers
  without WASM are unsupported; no fallback.
- **Per-expression** (timeout, memory, user-code throws) → unchanged.
  Existing sentinel-based error reconstruction continues to work.
- **No fallback to legacy.** If QuickJS init fails the editor surfaces the
  error rather than silently degrading. Acceptable for POC.

## Testing

Existing tests act as the regression net. New tests prove the new behavior
works as expected and catch errors early.

- **One new integration test** in the existing `quickjs-engine` vitest
  project: construct `QuickJsBridge` with an inlined `runtimeBundle` string
  (read from disk in test setup, passed as string) and verify the bridge
  initializes and evaluates without invoking the filesystem path. Proves the
  new code path works.
- **All 45 existing integration tests** continue to pass under both
  `isolated-vm-engine` and `quickjs-engine` projects.
- **Browser bundling check.** Build editor-ui locally; verify the bundle
  doesn't include `node:fs` / `node:path`. If it builds, that's the test.
- **Manual editor-ui smoke.** Open editor, evaluate `{{ $json.foo }}` with
  small input data. Confirm `{{ document.cookie }}` evaluates to `undefined`
  or errors cleanly (API confinement check). Confirm `{{ while(true){} }}`
  doesn't hang the editor (timeout fires).

### Out of scope for POC

- Browser-side performance benchmarks.
- Visual regression / autocomplete UX testing.
- Behavioral parity audit between legacy and QuickJS in the browser. That is
  Phase 4 cleanup work, after the POC validates the approach.

## Fallback plan

If approach A (string injection + `?raw` import) proves too complicated to
get past the editor-ui bundler, stop and re-evaluate before forcing it. Two
plausible fallbacks:

1. **Approach C: refactor to a `loadBundle` strategy function.** Cleaner
   separation, larger refactor.
2. **Approach B: separate `quickjs-browser-bridge.ts` file.** Some
   duplication, no conditional imports.

Decision is reactive, not pre-committed.

## Open questions deferred to later phases

- WASM loading optimization (eager preload vs current lazy dynamic import) —
  POC uses whatever is easiest.
- Backend default engine switch from legacy to vm/quickjs.
- Legacy code removal sequencing.
- Behavioral parity gaps that surface during real editor usage.
