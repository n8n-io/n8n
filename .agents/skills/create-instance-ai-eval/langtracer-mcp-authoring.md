# Authoring through the LangTracer MCP (write tools)

The main flow of this skill authors a local JSON file and pushes it with
`eval:langtracer-push`. LangTracer's MCP server also exposes the write side
directly — the same write services the app UI and the push CLI delegate to —
so an agent session can draft, create, file, and tag cases without touching
the repo. Connection setup is in [`sourcing-cases.md`](sourcing-cases.md); one
`lt_` key serves reads and writes, and every write is attributed to the key's
owner.

## When to author over MCP (and when not to)

Use the MCP path when the case is born on the LangTracer side:

- Filing a finding straight out of a review or cluster session, while the
  conversation context is still loaded.
- Bulk-filing several drafts from a cluster run for later calibration.
- LT-side metadata work on existing cases: tags, provenance links, suite
  membership, scenario tweaks (the provenance step in
  [SKILL.md](SKILL.md#link-the-pushed-case-to-its-source-provenance-step--always-do-this)
  already works this way).

Stay on the repo path (the rest of this skill) when the deliverable is a
calibrated corpus case: you need the local JSON to run the harness against a
real build, and calibration is what earns a case its suite slot. The two paths
converge — an MCP-created case lives in the same suites and exports the same
schema (`export_suite` server-side, `--source langtracer` from the CLI).

## Search before you author

Duplicates split run history across two case ids, so check first:
`search_test_cases` (free text over name / description / expected behavior /
failure pattern, and tags) or `list_test_cases` filtered by suite. If a
near-duplicate exists, extend it — add a scenario or tags with the tools below —
instead of creating a sibling.

## Draft from real evidence: `draft_test_case`

Pass exactly one of `threadId`, `clusterId`, or `themeId`. You get back the
full draft envelope (conversation, scenarios, process/outcome expectations),
the exported n8n case file, and a paste-ready calibration brief. It runs the
platform's grounded drafter: ~30–90s, AI cost, persists nothing.

- Run `get_conversation_analysis` on the thread first — the drafter then sees
  the produced workflow and emits node-accurate scenarios.
- Always read `draftWarnings` (degraded drafting conditions) and `draftError`
  (validator rejection) before using the envelope.
- A draft is a DRAFT. It goes through the same shape/expectation gates as a
  hand-written case (see SKILL.md) and gets calibrated against a real build
  before it earns a suite slot.
- Prefer generic descriptors ("the CRM", "the client") over invented proper
  nouns when editing draft content — the scrubbing layer randomizes names
  per-field, so invented names don't survive round-trips consistently.

## Create and file: `create_test_case` + suite tools

- `name` is the case's identity and its export slug. Locally the filename is
  the case name; over MCP the `name` field plays that role — same lowercase
  kebab conventions.
- `conversation[0]` is load-bearing, exactly as in the local schema: the
  user-proxy sends only it, verbatim, so it must be a self-contained statement
  of the capability under test.
- New cases are gated as user-data by default; pass `synthetic: true` for
  authored content, or the case is fenced to user-data-capable runners.
- `setKind` (`regression` | `capability_gap`) must match the suite's kind.
  The same judgment call as the push CLI applies: a correct build with a
  currently-red execution scenario is still a `regression` case.
- File with `add_cases_to_suite`; relocate with `move_cases_to_suite`; unfile
  with `remove_case_from_suite`. Suites themselves have `create_suite` /
  `update_suite` / `delete_suite`.
- Scenario edits: `add_scenario`, `update_scenario`, `delete_scenario` — edit
  in place rather than deleting and recreating the case, because run history
  joins scenario identity. Content updates through `update_test_case` record
  a revision, so history shows what each run actually ran against.

## Seed rules (one slot, both paths)

One seed slot: `metadata.seed`, discriminated on `mode` — full shape doctrine
in [`case-shapes.md`](case-shapes.md).

- `inline` is the durable mode. The seed rides the case body, so the case
  lives in a suite like any other.
- `replay` is trace-backed and expires with the LangSmith trace (~14 days).
  Suite membership is refused everywhere, MCP included. Graduate it with
  `scrub_test_case`, then read the result: scrub makes a case PII-clean, not
  corpus-ready — it doesn't snap the opener, translate, or trim junk.
- Never overwrite or clear a replay seed; the server refuses both, because
  either would destroy the only pointer to the source input.

## Bulk-filing from a cluster run

The pattern for turning a theme report into triage-ready drafts:

1. `get_latest_cluster_run` (or `get_cluster_run` by id) to pick themes worth
   encoding.
2. Per theme: `draft_test_case` with `themeId`, review the envelope and
   warnings.
3. `create_test_case` with `synthetic: true` and a capability tag via
   `add_case_tags` (normalization is aggressive — lowercase kebab, colon-form
   tags silently dropped).
4. `add_cases_to_suite` into the team's capability suite.
5. Calibrate later from the repo: pull with `--source langtracer`, run against
   a real build, and fix expectations with `update_test_case`.

Provenance discipline is the same as the push flow: `sourceThreadId` (+
`sourceRunId` for a specific step), `expectedBehavior`, `failurePattern`, and
the thread id in `description` — see the provenance step in SKILL.md.
