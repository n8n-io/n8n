# Intent Router (system-one fast path)

With `N8N_INSTANCE_AI_FAST_PATH_ENABLED=true`, every chat turn is classified
before any language model runs. When the router is confident, the compilers
serve the turn directly and the orchestrator LLM is never invoked. The LLM
runs only when the router is not confident or a compiler hands the turn back.

```text
POST /chat/:threadId
     │
     ▼
run-start
     │
     ▼
Intent router                                  src/intent-router
  ├─ pending compiler question?  → answer          (no read)
  ├─ small talk / pure question? → orchestrator    (no read)
  └─ one structured read over the bounded routes
       prior: deterministic cues · vetoes: conversation state
     │
     ├─ confident compiler route ─► build-workflow / build-agent tool
     │      tool-call · tool-result · text-delta · run-finish   (no LLM)
     │      ├─ compiled / clarification / setup → reply
     │      └─ failed / denied / needs artifacts → hand back ┐
     │                                                       ▼
     └─ orchestrator ────────────────────────────► LLM agent turn
```

## Routes

| Route | Served by | Requires |
|---|---|---|
| `workflow.create` | `build-workflow` action create | — |
| `workflow.edit` | `build-workflow` action edit | a workflow bound to the thread |
| `workflow.debug` | `build-workflow` action debug | a workflow bound to the thread |
| `agent.create` | `build-agent` action create | — |
| `agent.edit` | `build-agent` action edit | an agent bound to the thread |
| `agent.verify` | `build-agent` action verify | an agent and a compiled session |
| `answer` | whichever compiler asked | a pending clarification |
| `orchestrator` | the LLM agent | — |

Vetoes come from conversation state, never from the model: no bound target
means no edit or debug route; attachments and an active planned task graph
keep the orchestrator.

## Policy

The router reuses the compiler decision service and policy
(`src/workflow-compiler/decision`). One `choice` read scores the allowed
routes; deterministic cue weights form the prior, with the orchestrator
always holding prior mass so that one strong cue is decisive without a read
and weak or conflicting cues are not. Below the act threshold the router
falls back to the orchestrator. Thresholds are uncalibrated defaults;
calibrate on labeled turns before tightening.

## Fast-path execution

`runFastPath` (`src/intent-router/fast-path.ts`) runs the compiler tool's
handler in-process with a fresh `toolCallId`, publishes `tool-call`,
`tool-result` and a deterministic `text-delta` reply on the event bus, and
records what it did in thread metadata (`instanceAiFastPath`: pending
clarification, bound workflow, last agent session, previous route). The host
persists the user and assistant messages and finishes the run.

Results that need the assistant (compile failures, denied approvals,
required workflow artifacts for an agent) hand the turn back with the tool
result already on the run; the orchestrator receives a `<fast-path-result>`
block and continues from it instead of starting over.

## Observability

Every turn records `instance_ai_fast_path` with the route, whether it was
handled, the decision source (`pending_session`, `rule`, `decision`, `prior`,
`fallback`), the confidence and the latency. Use it to measure the share of
turns served without the LLM and to calibrate thresholds.
