# Sourcing cases from real failures (LangTracer + LangSmith)

The strongest cases encode a **real** failure, not an invented premise. Two
connections help you find one and confirm it — and neither is usually the
durable artifact. You author a synthetic case from what you learn (reach for
`seed.mode: "replay"` only per [`case-shapes.md`](case-shapes.md)).

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
   (findings). `get_linear_ticket_context` links a thread to its ticket. To target
   **execution failures**, add `funnelDrop:"05"` (built + launched an execution
   that never *succeeded*). **Caveat: the funnel drop is a *conversion* signal, not
   a build-quality one** — most `funnelDrop:"05"` threads are healthy builds that
   correctly routed to credential setup, or the user simply abandoned, so the drop
   alone tells you nothing about the build. **Pair it with `verdict:"bad"`** to
   filter down to threads where the analyser actually flagged a build/execution
   defect (in one sample: 131 raw drops → 18 once `verdict:"bad"` was added).
3. **Verify before trusting a finding.** The analyser keys off tool-call *spans*
   (was `build-workflow` called on this turn?), which it reads reliably — but a
   content-dependent claim ("invented ID", "missing node") can be wrong when it
   couldn't see the built workflow. Confirm against the raw trace before building
   a case around it.
4. **Encode a durable synthetic case** — turn the confirmed failure into an
   authored case ([SKILL.md](SKILL.md), [`case-shapes.md`](case-shapes.md)). The
   failure mode is the anchor; the conversation is yours to write, in the user's
   voice.
5. **Push it to a curated suite** (don't commit the JSON) with
   `eval:langtracer-push` — see
   [Push to a lang-tracer suite](SKILL.md#push-to-a-lang-tracer-suite). An `inline`
   seed rides along with the case. Exception: a `replay` case is refused and listed
   under `skipped:` — it's reconstructed from a trace at run time, so it dies when
   that trace is pruned and has no durable home; that's exactly why step 4 turns the
   confirmed failure into a durable synthetic case.

## Was the workflow handed over? (sourcing an `attach` opening)

Whether the opening turn carries `attach` is a **fact about the thread**, not a
judgement call — and guessing wrong makes the case harder than reality. Read it two
ways, depending on when the thread was imported:

- **Recorded.** Turn 0 of `get_conversation` carries
  `resourceAttachments: [{ "type": "workflow", "id": "…" }]`. That's the editor
  hand-off verbatim. Only kind and ids are stored, never the workflow's name.
- **Inferred**, for threads imported before n8n traced it. The tell is an opening turn
  whose `userMessage` is **empty** — the editor's context block is stripped before the
  trace, so a hand-off where the user typed nothing leaves a blank record. Corroborate
  with an early `workflows[get]` on a workflow the user never named.

Then use the id to recover the workflow itself: find the tool call whose *input*
carries that `workflowId` (usually `workflows[get]`, `full: true`) — its **output** is
the workflow, nodes and connections and parameters, and that is what you scrub into
`seed.workflows`. The id alone is only a join key; it addresses the user's own
instance, so it is worthless by itself.

Two things to expect:

- **The agent may never have read it.** Then you have an id and no content, and the
  workflow is yours to write — keep the topology plausible for the complaint.
- **The opening often has no text at all.** Keep it that way; see the empty-opening
  note in [`case-shapes.md`](case-shapes.md).

## Sourcing a regression baseline (successful builds)

The discover→verify→encode flow above hunts **failures**. The complementary need
— a broad **regression baseline** of things that already work — is sourced the
opposite way: from conversations where a workflow was **built and executed
without errors**. Use `list_conversations` with the **conversion-funnel** filter:

- `funnelStep: '03'` = built a workflow, `'04'` = launched an execution, `'05'` =
  execution succeeded, `'06'` = published (each step is a strict subset — also
  reached every earlier step). For "built + executed cleanly" cases, **`'05'`** is
  the signal; add `language: 'eng'` to keep prompts English.
- The result is large — it spills to a file. Triage by first prompt:
  `jq -r '.data[] | "\(.threadId)\t\(.firstUserPrompt[0:180])"'`. Skip "The
  execution failed…" debugging threads (they didn't cleanly build) and off-topic
  app-build requests.
- Author a **build case** per selected thread (prompt in the user's voice,
  grounded in the real `firstUserPrompt`; note the source thread id in
  `description`). These are `regression`-kind cases whose value is coverage of a
  working capability, not a currently-red gap — you rarely need `get_conversation`
  when the first prompt already specifies the build. Terse prompts almost always
  need a multi-turn director note (see [`case-shapes.md`](case-shapes.md)).

## Two practical notes on `get_conversation_analysis`

- **It hands you draft cases.** The response's
  `aiAnalysis.structured.extractedCases[]` are pre-drafted candidates — each with
  `expectedBehavior`, `proposedCheck`, and `failurePattern` that map almost 1:1
  onto `outcomeExpectations` / `processExpectations`. Start from these rather than
  a blank case (still verify against the raw trace per step 3, and rewrite the
  prompt in the user's voice). `verdict` and `findings` sit alongside them.
- **The payload is large** — tens of thousands of characters, enough to exceed a
  tool's token cap and be spilled to a file. The useful part is
  `aiAnalysis.structured`; `jq` into that (or into `.extractedCases`) rather than
  reading the whole blob.
