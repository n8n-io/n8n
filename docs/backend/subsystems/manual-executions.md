---
title: Manual executions
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Manual executions

Read this when you work on "Test workflow" or "Test step", on how results stream to the editor, or on test webhooks.

## What it is

A **manual execution** is a run that starts from the editor's test buttons. The AI assistant can also start one for the user. It runs in execution mode `manual` and uses pinned data. It streams every node result to the browser tab that started it. It can first wait for a **test webhook** to receive a real request.

The HTTP entry point is `POST /rest/workflows/:workflowId/run`. The request body takes one of three shapes. `triggerToStartFrom` means a full run from a known trigger. `destinationNode` plus `runData` means a partial run. `destinationNode` alone means a full run from a trigger that n8n must find.

## Why it has this shape

**Results go to one browser tab.** The editor sends a `push-ref` header that names its tab. Every lifecycle hook sends its message to that push reference. A worker, or a main that does not hold the push connection, relays the message over pubsub to the main that holds it.

**Two messages per node result.** `hookFunctionsPush` sends a small `nodeExecuteAfter` message with metadata and item counts. Then it sends a binary `nodeExecuteAfterData` frame with the redacted output items. The item counts tell the editor how many items to expect.

**Manual runs are saved like other runs.** Each is an `execution_entity` row with mode `manual`. When the workflow says not to save manual executions, n8n soft-deletes the row after the run. Only the user who started it can read it until pruning removes it.

**A full run can wait instead of run.** Sometimes n8n registers a test webhook first. This happens when the trigger is a webhook without pinned data, or the request carries a chat session id. The response is `{ waitingForWebhook: true }` instead of an execution id. The run starts when the request arrives on the test URL.

**Test webhook registrations live in a shared cache.** Any main can receive the request, and every main reads the registration from one cache hash. The hash has a time to live of the test timeout plus a buffer. A crashed main then does not leave registrations behind. In multi-main, a main that runs another main's test webhook publishes `clear-test-webhooks`, and the creator main cleans up.

**Manual runs used to stay on the main.** In queue mode, manual runs ran on the main unless `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` was `true`. The code now stores in `manualData` everything that a worker needs, so the offload is the supported path. The flag is read from `process.env`, not from `@n8n/config`.

**Test webhooks are served by mains only.** `AbstractServer` turns test webhooks off by default. Only `Server` turns them on.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Route | `packages/cli/src/workflows/workflows.controller.ts` | `WorkflowsController.runManually` |
| Request shapes | `packages/@n8n/api-types/src/dto/workflows/manual-run.dto.ts` | `ManualRunDto` |
| Case selection | `packages/cli/src/workflows/workflow-execution.service.ts` | `WorkflowExecutionService.executeManually` |
| Main or worker | `packages/cli/src/workflow-runner.ts` | `WorkflowRunner.run` |
| Engine entry points | `packages/cli/src/manual-execution.service.ts` | `ManualExecutionService.runManually` |
| Push hooks | `packages/cli/src/execution-lifecycle/execution-lifecycle-hooks.ts` | `hookFunctionsPush` |
| Test webhook lifecycle | `packages/cli/src/webhooks/test-webhooks.ts` | `TestWebhooks.registerWebhooks` |
| Test webhook cache | `packages/cli/src/webhooks/test-webhook-registrations.service.ts` | `TestWebhookRegistrationsService` |
| Push and relay | `packages/cli/src/push/index.ts` | `Push.send` |
| Push message types | `packages/@n8n/api-types/src/push/execution.ts` | `NodeExecuteAfterData` |

## What is moving

n8n logs a deprecation warning in queue mode when the offload flag is not set. v3 removes the choice: in queue mode, manual executions always run on workers. See `packages/cli/src/modules/breaking-changes/rules/v3/offload-manual-executions.rule.ts`.

## Read more

- [Life of a webhook execution](../life-of-a-webhook-execution.md) for the production path
- [Webhooks, push, and concurrency](webhooks-push-and-concurrency.md)
- [The v1 execution engine](execution-engine.md) for partial executions and pinned data
