# TypeSafe browser-action benchmark

Offline benchmark for one question: **can a TypeSafe System One model pick the
next browser action from a page snapshot accurately enough to execute it
without a real-LLM turn?**

It measures the **production path**: `buildRequest`, `createSystemOneFn` and
`decide` are all imported from `@n8n/mcp-browser`, the same functions
`browser_act` runs. A number here is a number about the shipped loop, not
about a copy of it. Background:
[.claude/plans/typesafe-in-browser-use-analysis.md](../../../../../.claude/plans/typesafe-in-browser-use-analysis.md).

## Run it

The API key comes from the environment, never from a command argument (pnpm
arguments are recorded by dev metrics):

```bash
source .env                                     # sets N8N_INSTANCE_AI_TYPESAFE_API_KEY
cd packages/@n8n/instance-ai
pnpm tsx evaluations/typesafe-browser/run.ts                  # bundled fixtures
pnpm tsx evaluations/typesafe-browser/run.ts path/to/cases.json
```

Results print to the console and land in
`.eval-output/typesafe-browser-results.json`.

## What it measures

One request per case, carrying everything at once (the speculative fan-out
pattern — parallel questions add almost no latency). The question set comes
from `buildRequest`, so it is exactly what the loop sends. Each case is then
run through `decide()` at a range of confidence thresholds; because `decide`
is pure, the sweep costs one API call per case rather than one per threshold.

Reported:

| Metric | Why it matters |
| --- | --- |
| Router accuracy | Did it identify the right kind of action? |
| **Ref accuracy** | The make-or-break number. Dense pages present many refs. |
| Exact match | Router and ref both right — a directly executable action. |
| Median latency / input tokens | Checks the ~100 ms and ~32k-budget claims. |
| **Coverage vs wrong-action rate** | The decision number: how many steps the loop would actually perform, and how many of those would be wrong. |
| Hand-back reasons | Why the loop stopped — `needs_text`, `guard`, `low_confidence`, `unclear`. |

All the gating rules live in `decide()` rather than here, so they cannot drift
from production: confidence is the **minimum** across the judgements an action
depends on (one wrong argument breaks it), guards use a max-style "any flag"
gate, and `browser_type` / `browser_navigate` always hand back because a
correct route still needs text or a URL that has to be written.

Note that "exact match" and "executed correctly" are different columns on
purpose. A case can be routed perfectly and still be held — which is the
system working, not failing.

## Case format

```json
[
  {
    "id": "credentials-page-create-button",
    "task": {
      "goal": "...",
      "step": "...",
      "knownValues": { "clientName": "n8n integration" },
      "recentActions": ["browser_click on \"Create credentials\" — menu opened"],
      "page": { "url": "https://...", "title": "Credentials" }
    },
    "snapshot": "- button \"Create credentials\" [ref=e13]\n...",
    "expected": { "tool": "browser_click", "ref": "e13" }
  }
]
```

`snapshot` is a `browser_snapshot` tree word for word. Both ref spellings
parse: Playwright's `[ref=eN]` and agent-browser's `@eN`.

Write `expected.tool` as `escalate` for pages where handing back to the real
LLM is the right answer — the sign-in-wall fixture is one.

## Getting real cases

The bundled fixtures are synthetic on purpose: they are modelled on a cloud
console OAuth flow but contain no real page content, so running the benchmark
sends nothing private to a third party. They are enough for a first read on
ref accuracy, not enough to decide on.

Harvesting real (snapshot → action) pairs needs one thing first: **the
computer-use eval report does not persist tool results.**
`ExecutionScenarioResult.toolCalls` keeps only
`{ name, args, argTokensEst, resultTokensEst }`
([evaluations/computer-use/types.ts](../computer-use/types.ts)), so the
snapshots are dropped on the way to disk even though the in-memory
`ScenarioTrace` has them. The labels (each call's `args`) survive; the states
do not.

Two ways forward, neither done here:

1. Persist `result` for `browser_snapshot` calls in the computer-use eval
   report, then pair each snapshot with the following call's `args`.
2. Export from LangTracer, whose stored conversations keep tool results.

## Notes

- No new dependency. The wire contract is one POST with three fields, so the
  client is plain `fetch` plus a Zod schema, shared with production. Move to
  `@typesafe-ai/sdk` if the feature graduates — it brings retries and inferred
  answer types neither side needs yet.
- The model is pinned to `jev-1.13.0` in
  [typesafe/client.ts](../../../mcp-browser/src/typesafe/client.ts). The API
  rejects an unknown id, so a bump is deliberate and visible; `jev-latest`
  echoes the version it resolved to in the response's `model` field.
