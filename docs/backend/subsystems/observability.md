---
title: Observability
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: looorent
---

# Observability

When something happens in the backend, such as a publication or the end of an execution, several parts of n8n want to know. This page explains how one event reaches all of them, which executions count, and the metrics, logs, and traces of a process. Read it before you add an event or a metric.

## Events

A service emits a typed event through `EventService`. It does not know who listens. **Relays** listen and pass each event to one consumer:

| Consumer | Receives |
|---|---|
| Log streaming | Events for external log destinations of the customer. This needs a license |
| Product telemetry | Usage events for PostHog and RudderStack. An instance with diagnostics off sends none |
| The activity log | Rows in the table `activity_event` |
| The failure email | The first failure of a production workflow |

To add an event, add its payload type to the event map, emit it, and handle it in the relays that need it. Log streaming users filter on event names such as `n8n.workflow.success`, so those names are a contract. `pnpm --filter @n8n/telemetry catalog` lists the telemetry events that have a definition.

The event bus behind log streaming is also a recovery log. Each process writes each event to a file on disk before it sends the event on. At startup, the process reads the file and marks executions without a final event as crashed.

## Execution counts

Billing, insights, and execution limits all count executions. One file decides which runs count for each of them: `packages/@n8n/backend-services/src/executions/counting-rules.ts`. A new execution mode needs an entry there. Do not write a list of modes of your own.

## Signals

With `N8N_METRICS=true`, each process serves Prometheus metrics at `/metrics`. Most groups of metrics have their own `N8N_METRICS_INCLUDE_*` flag.

`N8N_LOG_LEVEL` sets the log level. `N8N_LOG_SCOPES` shows only the lines of the scopes that it names, so a line without a scope disappears. Give the logger of your service a scope.

The `otel` module sends OpenTelemetry traces of workflow and node executions.

## Quiz

1. You add a new execution mode. What must you also change?
   - A. Add an entry for it in `counting-rules.ts`.
   - B. Add a list of counted modes to your service.
   - C. Nothing. All modes count by default.
   - D. Add a telemetry event for the mode.
2. You rename the event `n8n.workflow.success`. Who notices?
   - A. Nobody. Event names are internal.
   - B. Only PostHog.
   - C. Only the failure email.
   - D. Log streaming users, because they filter on event names.
3. An operator sets `N8N_LOG_SCOPES=scaling`. Your service logs without a scope. What does the operator see?
   - A. All of your lines.
   - B. Only your error lines.
   - C. None of your lines.
   - D. Your lines, with the scope `scaling`.
4. A process starts after a crash. What does the event log do?
   - A. Nothing. The event log is only for log streaming.
   - B. The process reads the file and marks executions without a final event as crashed.
   - C. It sends the old events to PostHog.
   - D. It runs the executions again.

<details>
<summary>Answers</summary>

1. A. Add an entry for it in `counting-rules.ts`. Billing, insights, and execution limits all use that one file. Do not write a list of modes of your own.
2. D. Log streaming users, because they filter on event names. Log streaming event names are a contract.
3. C. None of your lines. The scope filter hides every line that has no scope. Give the logger of your service a scope.
4. B. The process reads the file and marks executions without a final event as crashed. The event bus writes each event to a file before it sends it on, so the file is also a recovery log.

</details>

[Roll out a change](../how-to/roll-out-a-change.md) shows how to use these signals during a rollout.
