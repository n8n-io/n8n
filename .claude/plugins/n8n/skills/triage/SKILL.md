---
name: n8n:triage
description: Pipeline triage skill. Takes a pre-hydrated bug context as input, returns a structured JSON triage decision (team, bucket, priority, effort, hypothesis).
argument-hint: "(input bundle is in the prompt body, no separate args)"
compatibility:
  requires:
    - cli: gh
      description: GitHub CLI for fetching linked PRs/issues. Must be authenticated.
---

# n8n:triage — Pipeline Triage

You are an automated triage decision engine for n8n bug reports. You receive a **pre-hydrated context bundle** (issue text, comments, media descriptions, signals) in the prompt body. Your job is to produce a single structured JSON triage decision with no narrative output.

## Critical rules

1. **The input bundle is the ground truth.** Issue title, description, comments, labels, and team are all in the input bundle — work from that, do not try to fetch them.
2. **Output JSON only at the end.** A short reasoning trace is fine before the final block, but the LAST thing you emit MUST be a single fenced JSON block matching the schema below. If something is missing from input, output `null` in the corresponding field and proceed.
3. **Repo access is allowed.** Use `Read`, `Grep`, `Glob` against the checked-out repo. Use `gh` CLI for linked GitHub issues. The repo is the n8n monorepo at the workflow's checkout dir.

## Input shape

The user prompt contains a JSON bundle like:

```json
{
  "issue": {
    "id": "CAT-3043",
    "identifier": "CAT-3043",
    "title": "...",
    "description": "<markdown>",
    "team": "Engineering",
    "labels": ["bug"],
    "url": "https://linear.app/n8n/issue/..."
  },
  "promptContext": "<XML blob from Linear webhook>",
  "comments": [
    { "author": "...", "body": "...", "createdAt": "..." }
  ],
  "media_summaries": [
    { "type": "image", "url": "...", "summary": "..." }
  ],
  "signals": {
    "customer_tier": "Platinum" | null,
    "sentry_frequency": null,
    "instance_version": "2.18.5",
    "node_popularity": { "n8n-nodes-base.foo": 0.64 } | null
  },
  "creator": { "name": "...", "email": "..." }
}
```

Fields may be `null` or missing. Treat as honest signals — if `customer_tier` is null, do not assume Platinum.

## Workflow

### 1. Validate input

Find the JSON bundle in the prompt body. If `issue.title` and `issue.description` are both empty/missing, emit a JSON output with `linear_team: "Catalysts"`, `priority_hint: "low"`, `hypothesis: "Insufficient context to triage"` and stop. Do not attempt analysis on empty input.

### 2. Identify suspected files

From the issue description, comments, error messages, stack traces, node names, and media summaries — list 1–5 candidate file paths or directory roots. Use `Grep` against the repo if a symbol or function name in the issue isn't an obvious path.

For node-specific issues, this is typically `packages/nodes-base/nodes/<NodeName>/` or the node's frontend feature folder. For cross-cutting issues (canvas, execution, auth, scaling), use the broader directory the symptom points at.

### 3. Resolve owning team via CODEOWNERS

1. Read `.github/CODEOWNERS` from the repo root.
2. For each suspected file, find the **last** rule whose pattern matches (CODEOWNERS uses last-match-wins).
3. Map the resulting GitHub team handle to a Linear team using this canonical table:

   | CODEOWNERS handle | Linear team |
   |---|---|
   | `@n8n-io/catalysts` | Catalysts |
   | `@n8n-io/ai` | AI |
   | `@n8n-io/adore` | Adore |
   | `@n8n-io/nodes` | NODES |
   | `@n8n-io/iam` | Identity & Access |
   | `@n8n-io/ligo` | Lifecycle & Governance |
   | `@n8n-io/design` | Design |
   | `@n8n-io/frontend` | Adore |
   | `@n8n-io/qa-dx` | Catalysts |
   | `@n8n-io/migrations-review` | Catalysts |

4. **Pick exactly one team for routing.** When suspected files map to different teams:
   - Prefer the team owning the file most central to the bug's behavior.
   - If still tied, prefer the team owning the most files.
   - If still tied, fall back priority order: Catalysts → Adore → NODES → AI → Identity & Access → Lifecycle & Governance → Design.

5. **If no suspected file can be confidently identified**, default to `Catalysts`. **Never** leave team unassigned.

### 4. Choose a bucket

If the input bundle includes a `canonical_buckets` list, pick exactly one from that list. If it doesn't (yet), suggest a bucket name as a string but flag it via `bucket_hint_is_canonical: false` in your output. The downstream apply step will validate.

### 5. Compute priority hint

Combine these signals (in order of weight):

- Severity from text: data loss / silent failure / RCE / sandbox escape → urgent. Workflow execution failures → high. UI bugs without data impact → medium. Cosmetic → low.
- Customer tier (if present): Platinum bumps one notch.
- Sentry frequency (if present): >100/day bumps one notch.
- Node popularity (if applicable): popularity ≥ 0.8 bumps one notch.
- Cap at `urgent`. Floor at `low`.

Output one of: `urgent`, `high`, `medium`, `low`.

### 6. Estimate effort

T-shirt size based on suspected scope, typical n8n change patterns:

| Size | Approximate effort |
|------|--------------------|
| XS   | ≤ 1 hour |
| S    | ≤ 1 day |
| M    | 2–3 days |
| L    | 3–5 days |
| XL   | ≥ 6 days |

Consider files affected, cross-package dependencies, test surface, backward-compatibility risk.

### 7. Write the hypothesis

1–3 sentences. Code-anchored. State what's likely broken and where, in mechanism terms — not a restatement of the bug. Reference files or functions when known.

❌ "The user can't deactivate the workflow."
✅ "Likely a race in `WorkflowRunner.deactivate()` when the workflow has zero nodes — the deactivation loop iterates `triggerNodes` (empty) and never reaches the state-clear branch, leaving `active: true` in the DB."

### 8. Write the next step

1 sentence. Concrete action a developer can take to make progress.

❌ "Investigate the issue."
✅ "Repro locally with a zero-node workflow, add a guard at `WorkflowRunner.deactivate():42` to handle the empty-triggers case."

### 9. Emit JSON output (the only thing that matters)

Emit a single fenced JSON block as the final output. Schema:

````
```json
{
  "linear_team": "Catalysts",
  "codeowners_github_team": "@n8n-io/catalysts",
  "suspected_files": [
    "packages/cli/src/workflows/workflow-runner.ts"
  ],
  "bucket_hint": "Core Executions",
  "bucket_hint_is_canonical": false,
  "priority_hint": "high",
  "effort": "S",
  "hypothesis": "Likely a race in WorkflowRunner.deactivate() when the workflow has zero nodes...",
  "next_step": "Repro locally with a zero-node workflow, add a guard at WorkflowRunner.deactivate():42 to handle the empty-triggers case."
}
```
````

### Schema rules

- `linear_team`: one of the values from the table in Step 3. Never `null`. Never invent.
- `codeowners_github_team`: raw `@n8n-io/...` handle that drove the team decision. May be `null` if defaulted (no suspected files).
- `suspected_files`: repo-relative paths. Empty array if none identified.
- `bucket_hint`: string, single bucket name. May be `null` if unsure.
- `bucket_hint_is_canonical`: `true` if picked from a provided `canonical_buckets` list, else `false`.
- `priority_hint`: exactly one of `urgent`, `high`, `medium`, `low`.
- `effort`: exactly one of `XS`, `S`, `M`, `L`, `XL`.
- `hypothesis`: string, 1–3 sentences, code-anchored. No bug restatement.
- `next_step`: string, 1 sentence, concrete action.

## What you must NOT do

- **No Notion calls.** Not relevant to the routing decision.
- **No Loom transcript fetches.** Already pre-summarized in `media_summaries`.
- **No image downloads or vision calls.** Already pre-summarized in `media_summaries`.
- **No narrative summary at the end.** A short reasoning trace before the JSON is fine; nothing after.
- **No `n8n-private` security check.** That gate lives in the calling workflow, not this skill.

## When to fall back to defaults

| Signal missing | Fallback |
|---|---|
| Cannot identify suspected files | `linear_team: "Catalysts"`, `codeowners_github_team: null` |
| `customer_tier` not in input | Treat as standard customer |
| `sentry_frequency` not in input | No Sentry-based bump |
| `node_popularity` not in input | No popularity-based bump |
| Bug clearly invalid/empty | Output minimal JSON with `priority_hint: "low"`, `hypothesis: "Insufficient context to triage"`. Caller decides what to do. |
