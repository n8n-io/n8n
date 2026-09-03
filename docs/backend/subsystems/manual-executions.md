---
title: Manual executions
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/catalysts"
---

# Manual executions

Read this when you work on "Test workflow" or "Test step", on how results stream to the editor, or on test webhooks.

## What it is

A **manual execution** is a run started from the editor's test buttons, or by the AI assistant on the user's behalf, which calls `WorkflowRunner.run` directly. It runs in execution mode `manual`, uses pinned data, streams every node result to the browser tab that started it, and may first wait for a **test webhook** to be called. The HTTP entry point is `POST /rest/workflows/:workflowId/run`, which chooses between a partial execution, a full run from a chosen trigger, or a full run whose trigger is derived from the destination node.

## How it works

`WorkflowsController.runManually` validates the body against `ManualRunDto`, which picks one of three schemas by the keys present: `triggerToStartFrom` means a full run from a known trigger, `destinationNode` plus `runData` means a partial run, and `destinationNode` alone means a full run from an unknown trigger. The controller reads the `push-ref` header, which names the browser tab, and calls `WorkflowExecutionService.executeManually`.

`executeManually` mirrors the three cases. For a partial run it checks that the destination is not a trigger and that some reachable root has run data, and otherwise upgrades to a full run. For a full run it asks `TestWebhooks.needsWebhook`. If the workflow starts from a webhook trigger without pinned data, or the request carries a chat session id, the service registers a test webhook and returns `{ waitingForWebhook: true }` instead of an execution id. Otherwise it builds the execution data with the mode, the pinned data, the push reference, the user id, the dirty node names, and the destination, and hands it to `WorkflowRunner.run`.

`WorkflowRunner.run` registers the execution and decides where it runs. In regular mode, and in queue mode without `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS`, it stays on the main. `runMainProcess` builds the workflow with pinned data, attaches the regular main hooks, and calls `ManualExecutionService.runManually`. That service chooses one of three engine entry points: rebuild the stack from a stored trigger output and run, a full `run()` with tool rewiring when the destination is a tool, or `runPartialWorkflow2` with the run data, the dirty nodes, and the destination.

**Streaming.** `hookFunctionsPush` sends `executionStarted`, `nodeExecuteBefore`, a metadata-only `nodeExecuteAfter`, a binary `nodeExecuteAfterData` frame with the redacted task data, and `executionFinished` or `executionWaiting`. All go to the push reference. A worker, or a main that does not hold the session, relays the message over pubsub as described in [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md). Node `console.log` output reaches the editor the same way.

**Test webhooks.** `TestWebhooks.needsWebhook` registers the webhook in a cache hash that every main can read. In multi-main the entry carries a time to live of two minutes plus thirty seconds, so that a crash does not leave it behind. Each registration carries the push reference. When the request arrives, the handling main runs the workflow and pushes `testWebhookReceived`. In multi-main, a main that does not hold the session publishes `clear-test-webhooks` so that the creator main cleans up. On timeout, the registration is removed and `testWebhookDeleted` is pushed.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/workflows/workflows.controller.ts` | `runManually`, route `POST /:workflowId/run`, scope `workflow:execute` |
| `packages/@n8n/api-types/src/dto/workflows/manual-run.dto.ts` | The three request shapes |
| `packages/cli/src/workflows/workflow-execution.service.ts` | `executeManually` |
| `packages/cli/src/workflow-runner.ts` | `run`, `runMainProcess`, `enqueueExecution` |
| `packages/cli/src/manual-execution.service.ts` | The three engine entry points |
| `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts` | `hookFunctionsPush` and the hook sets |
| `packages/cli/src/webhooks/test-webhooks.ts`, `test-webhook-registrations.service.ts` | Test webhook lifecycle |
| `packages/cli/src/push/index.ts` | `Push.send`, the pubsub relay |
| `packages/@n8n/api-types/src/push/execution.ts` | The push message types |

## What it owns

Manual runs are `execution_entity` rows with `mode = 'manual'`. When the workflow says not to save manual executions, the row is soft-deleted after the run, unless the run is waiting. The cache hash `test-webhooks` holds registrations, in Redis in queue mode and in memory otherwise. Pubsub commands `relay-execution-lifecycle-event` and `clear-test-webhooks` travel on `n8n.commands`.

## Flags

`OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` is read from `process.env`, not through `@n8n/config`. It sends manual runs to workers in queue mode and switches off the main's task runner. `EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS` is the default for saving, overridable per workflow. `EXECUTIONS_DATA_SAVE_ON_PROGRESS` writes after every node. No license flags.

## Per mode

Regular mode runs manual executions on the main. Queue mode runs them on the main unless the offload flag is set, and n8n logs a deprecation warning when it is not. Workers attach push hooks only for manual runs. Test webhooks are served by mains only, because `AbstractServer` defaults test webhooks off and only `Server` turns them on. In multi-main, the push relay and the `clear-test-webhooks` command bridge the main that handles the request and the main that holds the session.

## Was, is, goes

**Was.** Manual runs in queue mode always ran on the main, and some execution details were never persisted. `ManualExecutionService` was extracted in December 2024. **Is.** The offload flag is the supported path in queue mode as of July 2026, and the code persists everything a worker needs in `manualData`. **Goes.** v3 removes the flag. The breaking-change rule says "In queue mode, manual executions are always routed to workers." Engine 2.0 takes routed manual runs inside `WorkflowRunner.run`, after the controller and the service have done their part.

## Terms

- **pushRef**: the id of the browser push session that started the run, sent as the `push-ref` header.
- **destinationNode**: the node the user clicked "Test step" on, inclusive or exclusive.
- **triggerToStartFrom**: the trigger the user chose, optionally with stored output so that the run does not listen.
- **dirtyNodeNames**: nodes the editor marks as changed, whose results are dropped before the run.
- **manualData**: what a worker needs to run a manual execution, carried inside the run data.
- **test webhook**: a temporary registration so that a manual run can wait for a real request on the test URL.
- **sequenceNumber**: a counter on the node progress push messages so that the editor can order late events.

## Read more

- [Life of a webhook execution](../life-of-a-webhook-execution.md) for the production counterpart
- [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md)
- `packages/cli/src/modules/breaking-changes/rules/v3/offload-manual-executions.rule.ts` for how v3 removes the offload flag
