---
title: Observability
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Observability

The [Workflow execution](workflow-execution.md) page followed one execution to its end. Several parts of n8n want to know when an execution ends, or when a user publishes a workflow.

This page explains how one event reaches all of them, how telemetry works, and which metrics, logs, and traces a process gives you.

## Events

Services emit events through `EventService`. They do not know who listens. **Relays** listen and pass each event to a consumer:

| Consumer | Receives |
|---|---|
| Log streaming | Events for external log destinations of the customer |
| Telemetry | Usage events for PostHog and RudderStack |
| Activity log | Recent changes to workflows and credentials, for features that read recent activity (e.g. the n8n Assistant) |
| Failure email | The first failure of a production workflow on the instance |

To add an event, add its payload type to `RelayEventMap`, emit it, and handle it in the relays that need it.

> [!WARNING]
> **Do not rename a log streaming event (e.g. `n8n.workflow.success`).** Customers filter their log destinations on these names.

The event bus behind log streaming is also a recovery log. Each process writes each event to a file before it sends the event on. At startup, the process uses this file to recover the executions that have no final event.

## Telemetry

Telemetry shows the product team how people use n8n. The backend sends telemetry events from the telemetry relay, or with a `Telemetry.track()` call.

> [!WARNING]
> **Never rename a telemetry event.** The data warehouse keeps one table for each event name, so a rename cuts the history of the event.

`@n8n/telemetry` holds a registry of events, with a schema of the properties of each event. Pass the registry entry to `track()`, so that a wrong property fails the typecheck. A backend event without `user_id` reaches RudderStack, but PostHog drops it. The `n8n:telemetry` skill explains how to add an event.

To see the events of a local instance, run `pnpm telemetry:sink`, and start the backend with `pnpm dev:be:telemetry`.

## Metrics, logs, traces

- **Metrics:** With `N8N_METRICS=true`, each process serves Prometheus metrics at `/metrics`. To add a metric, add a [collector](../../packages/cli/src/metrics/prometheus). Do not label a metric with workflow or instance IDs, because each new label value creates a new time series.
- **Logs:** Add a scope for your service to `LOG_SCOPES`, and give its logger that scope. At debug level, `N8N_LOG_SCOPES` then shows only the lines of the scopes that it names.
- **Traces:** The `otel` module sends OpenTelemetry traces of workflow and node executions. Set `N8N_OTEL_ENABLED=true` to send them.

[Roll out a backend change](how-to/roll-out-a-change.md) shows how to use these signals during a rollout.

## Quiz

1. You rename the event `n8n.workflow.success`. Who notices?
   - A. Nobody. Event names are internal.
   - B. Only PostHog.
   - C. Only the failure email.
   - D. Log streaming users.
2. A telemetry event has a name with a typo. What do you do?
   - A. Rename the event in the registry.
   - B. Keep the name.
   - C. Rename it, and also rename the old table.
   - D. Send both names for one release.
3. You set `N8N_LOG_LEVEL=debug` and `N8N_LOG_SCOPES`, and see none of the lines of your service. What is a likely cause?
   - A. Telemetry is off.
   - B. The logger of your service has no scope.
   - C. Metrics are off.
   - D. The `otel` module is off.

<details>
<summary>Answers</summary>

1. D. Customers filter their log destinations on these names.
2. B. The data warehouse keeps one table for each event name, so a rename cuts the history of the event.
3. B. At debug level, `N8N_LOG_SCOPES` shows only the lines of the scopes that it names.

</details>
