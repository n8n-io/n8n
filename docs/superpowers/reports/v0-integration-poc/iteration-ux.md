# Iteration UX

## Summary

The PoC requires a published (active) workflow so the v0-generated frontend can hit a real production webhook. Refining the generated UI against a real response then takes eight manual steps. This note evaluates three optimisations from the spec. **Recommendation: ship Option B (auto-pin latest execution) first** — it removes 4–5 steps for roughly a day of work. Option A (persistent test webhooks) is the most ambitious and probably its own spike. Option C sits in between and is worth revisiting if friction persists after B.

## Current friction

Today's loop, per iteration:

1. Edit the workflow (creates a draft).
2. Click Publish to activate a new version.
3. Open the v0 iframe and submit something.
4. The webhook fires; an execution is recorded.
5. Open the executions tab, find the new execution.
6. Pin the relevant node's data so it appears in `workflowsStore.getWorkflowRunData` (consumed by `packages/frontend/editor-ui/src/features/frontend-builder/composables/useFrontendBuilder.ts`).
7. Return to the Frontend drawer.
8. Send a follow-up message; the composable picks up the pinned data and v0 regenerates.

Eight steps for a feature whose entire value is fast iteration is too many.

## Option A — Persistent test webhooks

Today's "Listen for test event" mode (`packages/cli/src/webhooks/test-webhooks.ts`) is one-shot — the registration is torn down after the first request. Option A keeps the test webhook live for the duration of the drawer session and surfaces every incoming test request as a visible execution in the editor in real time (today only the first one shows). This removes the activation requirement entirely: users never publish until they're satisfied.

- **Effort:** large — realistically 2–3 weeks, possibly more. Touches load-bearing webhook lifecycle code and the executions push channel. Hard to estimate confidently without a deeper read of `test-webhooks.ts` and the push subscriber.
- **Risks:** regressions in the existing one-shot flow that everyone uses; leaked registrations if the drawer-close hook misfires; auth/CORS edge cases for browser-originated calls; ambiguity around which version of a draft a test request executes against.
- **Activation required:** **no** — this is the only option that removes the publish step.

## Option B — Auto-pin latest execution

When the user sends a follow-up in the drawer, the composable calls `/rest/executions?workflowId=...`, takes the most recent execution newer than the one already loaded, pins its node output into `workflowsStore`, and includes it in the prompt. The user no longer touches the executions tab or the pin UI. This collapses steps 5–7 into nothing and skips step 4 as a manual concern.

- **Effort:** small — about a day. A few additions to `useFrontendBuilder.ts`, one new typed API call alongside `packages/frontend/editor-ui/src/features/frontend-builder/api/frontend-builder.api.ts`, and reuse of the existing pin-data store action.
- **Risks:** stale or wrong execution picked if the user has been running the workflow elsewhere (mitigatable with a session-start timestamp filter); race between webhook-write and follow-up-send; pinning behaviour conflicting with anything the user pinned manually.
- **Activation required:** **yes** — still relies on a published webhook.

## Option C — Live execution view

The drawer renders a "executions in this drawer session" pane that updates in real time via the existing push channel; each row is clickable to pin. This makes the loop visible without auto-deciding for the user — useful when several requests arrive and the latest isn't necessarily the one you want.

- **Effort:** medium — 3–5 days. New Pinia slice scoped to drawer session, push subscription wiring, and a small list component in `packages/frontend/editor-ui/src/features/frontend-builder/components/`.
- **Risks:** noisy when the workflow has unrelated traffic; push-subscription cleanup bugs on drawer close; UI real-estate cost in an already busy drawer.
- **Activation required:** **yes**.

## Recommendation

Ship **B** now. It is the highest-leverage, smallest fix and is reversible — if it picks the wrong execution often enough to annoy users, we can layer C on top and let B be the default with an override. Treat **A** as a separate spike: removing the publish step is genuinely valuable but the cost is large enough that it deserves its own design pass and risk budget. Revisit **C** only if, after B lands, users report needing to pick a non-latest execution often.
