---
title: Observability
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: looorent
---

# Observability

[Workflow execution](workflow-execution.md) followed one execution to its end. Several parts of n8n want to know when an execution ends, or when a user publishes a workflow. This page explains how one event reaches all of them, how product telemetry works, which executions count, and the metrics, logs, and traces of a process.

## Events

A service emits a typed event through `EventService`. It does not know who listens. **Relays** listen and pass each event to one consumer:

| Consumer | Receives |
|---|---|
| Log streaming | Events for external log destinations of the customer. This needs a license |
| Product telemetry | Usage events for PostHog and RudderStack. An instance with diagnostics off sends none |
| The activity log | Rows in the table `activity_event` |
| The failure email | The first failure of a production workflow |

To add an event, add its payload type to the event map, emit it, and handle it in the relays that need it. Log streaming users filter on event names such as `n8n.workflow.success`, so those names are a contract.

The event bus behind log streaming is also a recovery log. Each process writes each event to a file on disk before it sends the event on. At startup, the process reads the file and marks executions without a final event as crashed.

## Telemetry

Product telemetry shows the product team how people use n8n. The backend sends these events through the `Telemetry` service in `packages/cli/src/telemetry/`, from the telemetry relay or with a direct `Telemetry.track()` call. An instance with diagnostics off sends none.

> **Never rename a telemetry event.** The data warehouse keeps one table for each event name, so a rename cuts the history of the event. Add new properties, and do not change the type of a property.

`@n8n/telemetry` holds a registry of events, with the name, a description, and a zod schema of the properties of each event. Pass the registry entry to `track()`, so that a wrong property fails the typecheck. `pnpm --filter @n8n/telemetry catalog` lists the registered events. Not all events are in the registry yet, so search the `track()` calls when the catalog has no match.

To see the events of a local instance, run `pnpm telemetry:sink`, and start the backend with `pnpm dev:be:telemetry`. The `n8n:telemetry` skill explains how to add an event.

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
   - D. Log streaming users.
3. A telemetry event has a name with a typo. What do you do?
   - A. Rename the event in the registry.
   - B. Keep the name.
   - C. Rename it, and also rename the old table.
   - D. Send both names for one release.

<details>
<summary>Answers</summary>

1. A. Billing, insights, and execution limits all use that one file. Do not write a list of modes of your own.
2. D. Log streaming event names are a contract.
3. B. The data warehouse keeps one table for each event name. A rename is a new event, so plan it with the data team.

</details>

[Roll out a backend change](how-to/roll-out-a-change.md) shows how to use these signals during a rollout.
