# Intent Router (system-one fast path)

With `N8N_INSTANCE_AI_FAST_PATH_ENABLED=true`, every chat turn is classified
before any language model runs. When the router is confident, a compiler
serves the turn and the orchestrator LLM never runs. The LLM runs only when
the router is not confident or a compiler hands the turn back.

For JEV, the router and likely operation choices share one HTTP request.
The compiler reuses these answers within the same turn. It does not reuse
answers across turns or users. Node descriptions load during the request.
The router reads the current message and target bindings. It does not send
the previous route, which can bias an edit toward the earlier create action.
The host restores the saved agent binding before it routes an agent edit.

Compiler saves prepare conservative simulation fixtures without a generative
model call. An unknown operation stays simulated. Saving does not claim that
the workflow or agent has run. See [live measurements](instant-generation-validation.md).

```text
run-start → intent router
  ├─ pending compiler question? → answer        (no read)
  ├─ small talk / pure question? → orchestrator  (no read)
  └─ one structured read over the allowed routes (cue prior, state vetoes)
       ├─ confident compiler route → build-workflow / build-agent handler
       │     tool-call · tool-result · text-delta · run-finish   (no LLM)
       │     failed / denied / needs artifacts → hand back with the result
       └─ orchestrator → LLM agent turn
```

| Route | Served by | Requires |
|---|---|---|
| `workflow.create` / `agent.create` | `build-workflow` / `build-agent` action create | — |
| `workflow.edit` / `workflow.debug` | `build-workflow` action edit / debug | a workflow bound to the thread |
| `agent.edit` / `agent.verify` | `build-agent` action edit / verify | an agent bound to the thread |
| `answer` | whichever compiler asked | a pending clarification |
| `orchestrator` | the LLM agent | — |

Vetoes come from conversation state, never from the model: no bound target
means no edit, debug or verify route; attachments and an active planned task
graph keep the orchestrator. The read uses the compiler decision service and
policy (`src/workflow-compiler/decision`). Deterministic cue weights form the
prior and the orchestrator always keeps prior mass, so one strong cue is
decisive without a read and weak or conflicting cues are not. Below the act
threshold the router falls back to the orchestrator. Thresholds are
uncalibrated defaults.

`runFastPath` (`src/intent-router/fast-path.ts`) runs the tool handler
in-process with a fresh `toolCallId`, publishes `tool-call`, `tool-result`
and a deterministic `text-delta` reply, and records the outcome in thread
metadata (`instanceAiFastPath`: pending clarification, bound workflow, last
agent session, previous route). The host persists both messages and
finishes the run. A result that needs the assistant hands the turn back with
the tool result already on the run; the orchestrator receives a
`<fast-path-result>` block and continues from it.

Every turn records `instance_ai_fast_path` with the route, whether it was
handled, the decision source, the confidence and the latency. Use it to
measure the share of turns served without the LLM and to calibrate.
