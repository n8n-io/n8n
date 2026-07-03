# Sourcing cases from real failures (LangTracer + LangSmith)

The strongest cases encode a **real** failure, not an invented premise. Two
connections help you find one and confirm it — and neither is usually the
durable artifact. You author a synthetic case from what you learn (reach for
`seedThread` only per [`case-shapes.md`](case-shapes.md)).

- **LangTracer — discover.** It ingests real Instance AI conversations and
  clusters them into **capability-gap themes** ("what fails, at scale"), and
  stores each analysed conversation. Use it to find high-frequency real failures
  worth encoding, instead of guessing a failure mode.
- **LangSmith — verify.** Eval runs and prod conversations land in LangSmith as
  raw traces. When a finding or a flaky result is ambiguous, read the raw trace
  to confirm exactly what happened — which tool calls fired, and their payloads.

## Connect the LangTracer MCP

The hosted instance exposes a streamable-HTTP MCP at `<base>/api/mcp`, authed
with an `lt_…` bearer (kept in `.env.local`: `LANGTRACER_API_KEY`; the hosted
base is the `LANGTRACER_URL` value). Register it the way your harness registers
MCP servers — e.g. in Claude Code:

```bash
claude mcp add --scope local --transport http langtracer-hosted \
  "<hosted-base>/api/mcp" --header "Authorization: Bearer $LANGTRACER_API_KEY"
```

`--scope local` keeps the key out of committed config. MCP servers load at
session start, so reconnect to pick it up. (The LangSmith MCP is usually already
connected.)

## Discover → verify → encode

1. **Scan cluster themes** — `list_cluster_runs` / `get_latest_cluster_run`
   return capability-gap themes with a `label`, `summary`, and `mechanism`: the
   real, recurring failure modes.
2. **Pull the conversations** — `list_conversations` (e.g. `verdict:"bad"`,
   `analyzed:"yes"`) → `get_conversation` (raw trace) + `get_conversation_analysis`
   (findings). `get_linear_ticket_context` links a thread to its ticket.
3. **Verify before trusting a finding.** The analyser keys off tool-call *spans*
   (was `build-workflow` called on this turn?), which it reads reliably — but a
   content-dependent claim ("invented ID", "missing node") can be wrong when it
   couldn't see the built workflow. Confirm against the raw trace before building
   a case around it.
4. **Encode a durable synthetic case** — turn the confirmed failure into an
   authored case ([SKILL.md](SKILL.md), [`case-shapes.md`](case-shapes.md)). The
   failure mode is the anchor; the conversation is yours to write, in the user's
   voice.
