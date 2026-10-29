## Workflow level OTEL
This module enables workflow level telemetry

The module plugs into n8n to add tracing. The process-wide OTel setup lives outside the module, in `packages/cli/src/observability/`.

It is based upon and an extension of the work done in the community by:
@gabrielhmsantos - https://github.com/gabrielhmsantos/n8n-tracekit

### Testing
Given OTEL often involves events triggered from elsewhere within the n8n system integration testing is preferred.

### Attributes
All attributes are listed in `otel.constants.ts`

### Global API ownership

n8n sets up OTel once at startup, right after Sentry, in every n8n process. The setup lives in
`packages/cli/src/observability/`. The task runner has no OTel.

Only these tracers export spans:

| Tracer name                                             | Exports when                                   |
| ------------------------------------------------------- | ---------------------------------------------- |
| `n8n-workflow`, `@n8n/agents`, `n8n-expression-runtime` | always                                         |
| `''` (Daytona)                                          | `N8N_DAYTONA_TRACING_ENABLED=true`             |
| `@microsoft/agents-telemetry`, `Agent365Sdk`            | `N8N_MICROSOFT_AGENT_365_TRACING_ENABLED=true` |

- A change to the OTel settings applies without a restart. The opt-in env vars above need one.
- `OTEL_SDK_DISABLED=true` turns off all of OTel.
- When another OTel setup is already registered at startup, for example with
  `NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register`, n8n leaves it
  alone. Workflow spans then go to that setup, and the n8n OTel settings have no effect.
- Workflow spans never join a trace that is active in the process. An inbound `traceparent`
  header still sets the parent.
- n8n sends `traceparent` on outbound requests only when OTel is on and
  `N8N_OTEL_TRACES_INJECT_OUTBOUND=true`. It never sends `baggage`.

`OTEL_*` env vars fill in what the n8n settings do not set:

- n8n ignores `OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_EXPORTER`,
  `OTEL_PROPAGATORS`, `OTEL_METRICS_EXPORTER` and `OTEL_LOGS_EXPORTER`.
- These apply: `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_NODE_RESOURCE_DETECTORS`, the
  `OTEL_EXPORTER_OTLP_*` certificate, timeout and compression variables, `OTEL_BSP_*`, extra
  header keys from `OTEL_EXPORTER_OTLP_HEADERS`, and `OTEL_LOG_LEVEL` (default `warn`).

### Outbound propagation

During an execution, n8n adds the W3C trace context to the requests it sends. The service that
n8n calls can then continue the trace.

There are two ways to add the headers:

- `httpRequest` and `request` add them for you. A node that uses these helpers needs no code.
- A node with its own HTTP transport calls `helpers.getTraceHeaders()` and adds the result to
  its request. The MCP client nodes do this, because the MCP SDK opens its own connection. The
  helper is public, so a community node can use it too.

`getTraceHeaders()` returns `traceparent`, and also `tracestate` when the trace has one. It
returns an empty object when OpenTelemetry is off, when `N8N_OTEL_TRACES_INJECT_OUTBOUND` is
off, or when no execution runs. Use the result without a guard.

Both ways obey these rules:

- **Read the headers for each request.** They name the span that is active now. A transport
  that stays open serves many spans, so a value read at connect names the wrong span later.
- **The trace context replaces** a header of the same name on the request.
- **The headers follow a redirect**, also across origins. A trace id is not a credential. On
  the MCP path, n8n first checks each hop against the credential allowlist and the egress
  filter.
- **A failure never stops the request.** The request goes out without the headers, and n8n
  logs a warning.

### Execution identity

Workflow and node spans carry `n8n.execution.id`, `n8n.workflow.id`, `n8n.workflow.name`,
`n8n.project.id` and `n8n.project.name`. Only team projects get a name, because a personal
project name holds the user's name and email.

- `ExecutionLevelTracer` builds the identity once for each execution segment and puts it in
  the parent context under a private context key.
- `ExecutionIdentitySpanProcessor` copies the identity from that key to each span at start.
  It never reads baggage: a caller can send `n8n.*` entries in an inbound `baggage` header,
  but cannot write the private key.
- The tracer never makes this context active. `getActiveContext` returns the span only.
- Each segment of an execution builds the identity from the current workflow name and
  project, because a workflow can be renamed or moved during a wait. A later segment runs
  the workflow saved at the start, so it reads the current name from the database.
- The identity is saved as an object in `tracingContext.identity`. A resume reads it only
  when the project lookup fails. A reconstructed crash span reads it, so it shows the
  identity of the last segment.

This key is n8n's single source of truth for the execution identity. Inbound and outbound
baggage (GOV-143) decides what it reads from this key and what it adds to baggage.

### Start marker spans

A span leaves n8n only when it ends. A marker span tells a trace backend that an execution
or a node started, before the real span ends.

| Environment variable                       | Default | Marker                                       |
| ------------------------------------------ | ------- | -------------------------------------------- |
| `N8N_OTEL_TRACES_EMIT_WORKFLOW_START_SPAN` | `false` | `workflow.execute.started` under each workflow span |
| `N8N_OTEL_TRACES_EMIT_NODE_START_SPAN`     | `false` | `node.execute.started` under each node span   |

- A marker is a child of the span that it announces. Its duration is 0 ms.
- A marker has the start attributes of its parent and the execution identity. The node
  marker does not have node custom tags, because n8n sets them when the node ends.
- Each `workflow.execute` span gets one workflow marker. A resume after a Wait node starts a
  new segment with its own `workflow.execute` span.
- In queue mode, main and the worker each send a `workflow.execute` span for each segment,
  so each segment gets two workflow markers. The marker from main shows when main queued the
  execution. The marker from the worker shows when the worker started it. The resource
  attribute `n8n.instance.role` (`main` or `worker`) tells them apart.
- The node marker follows the rules of `node.execute`. With
  `N8N_OTEL_TRACES_INCLUDE_NODE_SPANS=false`, no node marker exists. The node flag doubles
  the number of node spans.
- Both flags follow `N8N_OTEL_TRACES_PRODUCTION_ONLY`. Set them on workers too.
- A marker that fails logs a warning. It does not stop the real span or the execution.

### Custom attribute prefixes

n8n adds a prefix to the keys of custom telemetry tags: `n8n.project.custom.`,
`n8n.workflow.custom.` and `n8n.node.custom.`. `N8N_OTEL_TRACES_CUSTOM_ATTRIBUTE_PREFIXES`
replaces them with a JSON object, for example `{"project":"","node":""}`.

- An empty string removes the prefix for that level. A level that is left out keeps its default.
- An invalid value logs a warning, and n8n uses the default prefixes.
- When keys collide, the more specific level wins: node, then workflow, then project.
- n8n compares the key after it adds the prefix. If that key matches a built-in key in `ATTR`, n8n drops it and keeps the built-in value.
- Node metadata from the Tools Agent (`ai.agent.*`) uses the node prefix too.
- Set the same value on main, workers and webhook processes.

### Module architecture
```mermaid
graph TD
    subgraph Module Layer
        MOD["OtelModule
        @BackendModule on main, worker and webhook"]
    end

    subgraph Configuration
        CFG["OtelConfig
        env vars to typed config"]
        SET["OtelSettingsService
        DB row merged with config, env vars win"]
        CTRL["OtelSettingsController
        main only: GET and PUT settings, POST test trace"]
    end

    subgraph SDK Layer
        SVC["OtelService
        builds the export parts"]
        SDK["OtelSdk (startup step)
        NodeSDK, tracer gate, swappable parts"]
        API["Global @opentelemetry/api
        registered once at startup"]
    end

    subgraph Instrumentation Layer
        LCH["OtelLifecycleHandler
        @OnLifecycleEvent and @OnPubSubEvent"]
        ELT["ExecutionLevelTracer
        span maps by execution id, W3C propagator"]
        TCS["TraceContextService
        trace context and identity on the execution row"]
    end

    subgraph n8n Core
        LC(("Lifecycle events
        workflowExecuteBefore, Resume, After
        nodeExecuteBefore, After"))
        PUB(("Pub/Sub
        reload-otel-config"))
        REQ["Request helpers
        httpRequest, request"]
        MCP["Nodes with their own transport
        MCP client nodes, helpers.getTraceHeaders()"]
        AGT["AgentRunTracingService
        AgentWorkflowExecutionService"]
    end

    COL[("OTLP collector")]

    MOD -- "1. load settings" --> SET
    SET --> CFG
    MOD -- "2. apply saved settings" --> SVC
    SVC -- "apply()" --> SDK
    SDK -- "registers at startup" --> API
    MOD -- "3. import handler" --> LCH
    MOD -- "4. main only" --> CTRL
    CTRL -- "applyAfterSave()" --> SVC
    SVC -- "publish" --> PUB
    PUB -. "fires" .-> LCH
    LCH -- "reloadSettings()" --> SVC

    LC -. "fires" .-> LCH
    LCH -- "start and end workflow and node spans" --> ELT
    LCH -- "persist and read" --> TCS
    ELT -- "trace.getTracer()" --> API
    REQ -- "outbound traceparent" --> ELT
    MCP -- "outbound traceparent" --> ELT
    AGT -- "getActiveContext()" --> ELT
    AGT -- "trace.getTracer()" --> API
    SDK -. "exports spans" .-> COL

    classDef module fill:#4a9eff,color:#fff
    classDef config fill:#f5a623,color:#fff
    classDef sdk fill:#7b68ee,color:#fff
    classDef inst fill:#50c878,color:#fff
    classDef core fill:#888,color:#fff

    class MOD module
    class CFG,SET,CTRL config
    class SVC,SDK,API sdk
    class LCH,ELT,TCS inst
    class LC,PUB,REQ,MCP,AGT,COL core
```

#### Manual validation
1. Create docker-compose files and start them `docker-compose up -d`
	 `docker-compose.yml`
```yaml
services:
  jaeger:
    image: jaegertracing/jaeger:latest
    ports:
      - "16686:16686" # UI
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    command: ["--config", "/etc/jaeger/config.yaml"]
    volumes:
      - ./jaeger-config.yaml:/etc/jaeger/config.yaml:ro
```

`jaeger-config.yaml`
```yaml
service:
  extensions: [jaeger_storage, jaeger_query]
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [jaeger_storage_exporter]

extensions:
  jaeger_storage:
    backends:
      memory:
        memory:
          max_traces: 1000
  jaeger_query:
    storage:
      traces: memory
    ui:
      config_file: ""

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  jaeger_storage_exporter:
    trace_storage: memory
```

Start n8n & point it at the jaeger instance
```
cd packages/cli
N8N_OTEL_ENABLED=true N8N_OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318 pnpm run dev
```

### Wire protocol (OTLP/HTTP vs OTLP/gRPC)

`N8N_OTEL_EXPORTER_OTLP_PROTOCOL` selects how spans are delivered. It mirrors the
upstream `OTEL_EXPORTER_OTLP_PROTOCOL` spec and accepts:

| Value                     | Exporter                                   | Conventional port |
| ------------------------- | ------------------------------------------ | ----------------- |
| `http/protobuf` (default) | `@opentelemetry/exporter-trace-otlp-proto` | 4318              |
| `grpc`                    | `@opentelemetry/exporter-trace-otlp-grpc`  | 4317              |

```
cd packages/cli
N8N_OTEL_ENABLED=true \
  N8N_OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
  N8N_OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4317 \
  pnpm run dev
```

Notes:

- Pick `grpc` only when the collector requires it (or for high span volume through
  infrastructure that passes HTTP/2 through cleanly). `http/protobuf` traverses
  proxies and firewalls more reliably and is easier to debug.
- The endpoint scheme controls TLS for **both** protocols: `https://` uses TLS,
  `http://` does not. There is no `grpc://` scheme.
- Because the scheme is load-bearing, `N8N_OTEL_EXPORTER_OTLP_ENDPOINT` must be an
  `http://` or `https://` URL. n8n logs a warning and uses the default endpoint if
  the value has another scheme or no scheme, e.g. `localhost:4318`. The scheme is
  matched case-insensitively, and n8n lowercases it before it reaches the exporter.
- gRPC endpoints take **no URL path**, so `N8N_OTEL_EXPORTER_OTLP_TRACING_PATH` is
  ignored when the protocol is `grpc`.
- `N8N_OTEL_EXPORTER_OTLP_HEADERS` entries are sent as gRPC metadata. Keys are
  lowercased (gRPC metadata keys are lowercase ASCII); an entry grpc-js rejects is
  skipped with a warning instead of failing startup.
- The startup connectivity check waits for a grpc-js channel to become ready for
  `grpc` (an HTTP `HEAD` request is meaningless against an HTTP/2-only server).
  The channel dials the host and port of the endpoint, so readiness proves TCP,
  the TLS handshake for `https://`, and an HTTP/2 connection. It is not proof that
  OTLP/gRPC is served there — use "Send test trace" in Settings → OpenTelemetry
  for the real check.
- An endpoint without a port dials the grpc-js default port 443, not 4317. Always
  give the port, e.g. `http://127.0.0.1:4317`.
- The check uses the default TLS trust store. It does not use the certificate
  material that the exporter reads from `OTEL_EXPORTER_OTLP_CERTIFICATE`,
  `OTEL_EXPORTER_OTLP_CLIENT_KEY` and `OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE`, so a
  collector behind a private CA, or one that needs mTLS, can fail the check and
  still receive spans.
- n8n has no setting for a custom CA or mTLS. Use the upstream
  `OTEL_EXPORTER_OTLP_*` certificate variables above, or `NODE_EXTRA_CA_CERTS`.
