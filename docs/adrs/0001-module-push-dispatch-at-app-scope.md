# ADR-0001: The shell dispatches module push handlers at app scope

Date: 2026-08-21 · Status: Accepted
Deciders: Alex Grozav · Informed by: [N8N-265](https://github.com/n8n-io/n8n/pull/34436) design by void, 2026-08-17
Supersedes: — · Superseded by: —

## Context

The frontend module SDK lets a module declare `pushHandlers` in its descriptor. Before this decision, that promise was false in most of the app, because one lifecycle was split in two:

- Registration was global and eager — `app/init/index.ts` calls `registerModulePushHandlers()`.
- Dispatch was local and lazy — only `usePushConnection()` read the registry, and only four editor call sites start it (`MainHeader.vue`, `DemoLayout.vue`, `SettingsCommunityNodesView.vue`, `WorkerList.vue`).

So a module handler ran only where an editor component was mounted. The first real consumer, the `instance-ai` credits push, exposed the defect: on `/assistant` with no workflow artifact panel open, the credits balance froze at the value it held when the view opened. The behaviour was intermittent, not absent — the artifact panel mounts `MainHeader`, so the push worked while such a panel was open. QA reproduced the freeze 3 of 3 runs (filter, 2026-08-17). `WorkflowCanvasHostBody.vue` had already recorded the same coupling as a known follow-up.

The dispatch context was also editor-shaped: `usePushConnection` passed `documentId` from `workflowDocumentStore`, which no non-editor layout can supply.

## Decision

The shell owns module push dispatch once, at app scope. `useModulePushDispatcher({ router })` attaches a single listener in `App.vue:72` and dispatches only to `pushHandlerRegistry`, with the published `ModulePushHandlerContext` (`router` only). `usePushConnection/usePushConnection.ts:73` early-returns on `pushHandlerRegistry.has(event.type)`, so a module keeps its override of a built-in type and no owned event runs twice. The four existing `initialize()` call sites do not change.

This adds one SDK contract rule: **a module push handler must not depend on the built-in handling of the same event.** The two listeners are independent, so their order is undefined. The rule is stated in `packages/frontend/@n8n/frontend-module-sdk/README.md` and beside the type in `src/types/push.ts`.

Alex also decided the fix ships inside PR #34436 rather than as a separate shell PR ("Fix it. Same PR.", 2026-08-19), together with the `commandRegistry` per-listener copy fix. That overrode the recommendation to keep both out of the slice-C branch.

## Rejected options

**A — call `usePushConnection().initialize()` in `InstanceAiLayout`.** Each `usePushConnection` instance appends its own queue listener, so opening an artifact panel on `/assistant` would dispatch every push twice. It would also run the built-in editor switch on a non-editor route against a fallback workflow document. Worst cost: the contract stays broken, so every new layout must opt in and the next module repeats the defect.

**B — keep the store listener beside the SDK handler.** Credits would stay correct, because `handleCreditsPush` writes absolute values. But the module would declare ownership it does not hold, and the contract would read "`pushHandlers` alone are not sufficient" — the opposite of what slice C exists to prove. `pushHandlerRegistry.register` keeps the first handler only, so the SDK cannot support two paths honestly.

## Consequences

Good: `pushHandlers` is true for every module in every layout. Dispatch depends on the published context only, so no module needs editor state. Slice C stays a demonstration of the seam instead of a workaround for it.

Bad: about 40 lines of shell code plus tests now sit on the module-push path, owned by the frontend shell rather than the SDK. The ordering of a module handler against a built-in handler for the same type is undefined, and only the contract rule — not the compiler — stops an author from depending on it. The early return runs for every event type, so a stale registry entry can silently suppress a built-in handler. Bundling the fix into #34436 raised the diff to 15 files across three code-owner teams (`@n8n-io/frontend` 6, `@n8n-io/ai` 4, `@n8n-io/catalysts` 5), so `REVIEW_REQUIRED` can need three approvals instead of one.

Neutral: `useModulePushDispatcher.test.ts` covers dispatch with no editor in scope.

## Evidence

Gate 3 re-run passed 8 of 8 rows on head `06e071f4d4` (filter, 2026-08-19): the AI view counts down live with no artifact panel, each push applies exactly once where `usePushConnection` is live, and the built-in `executionFinished` and `sendConsoleMessage` handling still lands. Application counts were measured with pinia `$onAction`, and each row printed the build fingerprint from the loaded bundle. Named gap: an artifact panel could not be opened, because an artifact needs a paid model run; the workflow editor was substituted as the same condition, labelled inferred equivalence. The container E2E suite did not run.

Head `01eb0e1141` differs from `06e071f4d4` in comment lines only, so the result carries (trigger, 2026-08-21).

## Revisit triggers

- A second module registers a handler for a type the shell also handles, so the undefined order becomes load-bearing.
- Any layout needs a dispatch context wider than `router`.
- A built-in handler is reported missing because a module owns its type.
