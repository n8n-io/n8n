---
name: n8n:community-pr-readiness-check
description: >-
  Checks if a community pull request is ready for human review. Verifies CLA
  signature, PR title format, description completeness, test coverage, and
  cubic-dev-ai issues, then triages to the right Linear team or recommends a
  close. Use when given a PR number or branch name to review, or when the user
  says /community-pr-readiness-check, or asks to check if a PR is ready for
  review.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(node:*), Read, Glob, Grep
compatibility:
  requires:
    - mcp: linear
      description: Required for reading and updating Linear tickets during triage
    - cli: gh
      description: Required for PR inspection and triage actions. Must be authenticated (gh auth login)
---

# Community PR Readiness Check

Given a PR number or branch name, determine whether it is ready for human review and take the right follow-up action.

## Decision tree

1. **Bot author** (`n8n-cat-bot` / `aikido-autofix`) → cleanup-only, no review. See "Internal automation PRs" below.
2. **Auto-rejection screen matches** (typo-only / unsanctioned new node) → action path **D — close** with the matching template.
3. **All checks pass** (`readyForReview === true`) → action path **B — triage to team**.
4. **One or more checks fail** → action path **A** (if title is minor-fix only) then **C — post comment**.

## Step 1 — Resolve the PR

If given a branch name, find the PR number first:

```bash
gh pr view <branch> --repo n8n-io/n8n --json number --jq .number
```

## Step 2 — Fetch and pre-process

```bash
gh pr view <number> --repo n8n-io/n8n \
  --json number,title,body,author,headRefName,headRefOid,files,isDraft,state,labels
```

### Internal automation PRs (bot authors)

If `author.login` is one of n8n's internal bots — `n8n-cat-bot` / `app/n8n-cat-bot` or `aikido-autofix` / `app/aikido-autofix` — skip the PR entirely and perform the cleanup actions below. Do **not** emit any JSON output.

1. Relabel the PR (both bots): swap `community` → `n8n team`:
   ```bash
   gh pr edit <number> --repo n8n-io/n8n --remove-label community --add-label "n8n team"
   ```
2. Update the linked Linear ticket (extract `GHC-XXXX` per step 5):
   - **`n8n-cat-bot`** — cancel: use the available Linear MCP issue-update tool with `state: "Canceled"`, no labels.
   - **`aikido-autofix`** — route to Dev Platform: use the available Linear MCP issue-update tool with `team: "Developer Platform"`, `state: "Triage"`, no labels.

When reviewing a batch, omit the skipped PR from the output. For a single PR, emit a one-line note (e.g. `Skipped & cleaned up #30591 (n8n-cat-bot): relabeled to n8n team, cancelled GHC-8398.`).

### Collision guard

If `triage:in-progress` is already on the PR, another reviewer is mid-triage — **bail out** to avoid double-processing. Emit a one-line note (e.g. `Skipped #30205: already has triage:in-progress`) and move on to the next PR. Do not run the checks, do not modify labels, do not touch Linear.

If the user explicitly asks to re-process a PR that's stuck on `triage:in-progress` (e.g. a previous run crashed), they can clear the label manually and re-invoke.

### Otherwise — mark in-progress

Strip any existing `triage:*` state label before adding `triage:in-progress`, so the single-state invariant holds even when re-reviewing a PR that was previously sent back with `triage:needs-info` or `triage:tests-needed`:

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:pending" \
  --remove-label "triage:needs-info" \
  --remove-label "triage:tests-needed" \
  --remove-label "triage:complete" \
  --add-label "triage:in-progress"
```

Only one of those `triage:*` labels will actually be present; `--remove-label` errors when a label is missing, so run each removal as its own call (or batch and ignore errors) and then do the add. A PR carries exactly one `triage:<state>` label at a time; the skill replaces `triage:in-progress` with a terminal state before exit (see `reference/label-flow.md`).

### Also fetch (in parallel)

```bash
# cubic-dev-ai PR review comments (for check E)
gh api --paginate "repos/n8n-io/n8n/pulls/<number>/comments" \
  --jq '.[] | select(.user.login == "cubic-dev-ai[bot]") | {body: .body, path: .path}'

# n8n-assistant issue comments (for the Linear ticket reference)
gh api --paginate "repos/n8n-io/n8n/issues/<number>/comments" \
  --jq '[.[] | select(.user.login == "n8n-assistant[bot]" or .user.login == "n8n-assistant") | .body] | join("\n")'
```

## Step 2.5 — Auto-rejection screen

Per `CONTRIBUTING.md`, two PR patterns should be closed outright rather than reviewed:

- **Typo-only PR** — diff is entirely spelling/grammar fixes with no logic or tests.
- **New-node PR** — adds a brand-new node, unless the n8n team has explicitly agreed to take it.

If either matches, set `checks.AutoReject` and skip directly to action **D**. Full rules and how to verify each pattern: see `reference/checks.md`.

## Step 3 — Run the five checks

Run when `AutoReject` is `null`. Full rules for each in `reference/checks.md`:

- **A. CLA** — `cla-signed` label present.
- **B. Title** — matches the conventional-commit regex. Authoritative rules in `.github/pull_request_title_conventions.md`.
- **C. Description** — every section heading and checklist item from `.github/pull_request_template.md` is present in the PR body. The template is read at check time, so changes to it propagate automatically.
- **D. Tests** — source logic changes have matching test files. Skip for `docs/ci/chore/build` PRs.
- **E. cubic-dev-ai** — no unresolved comments (resolved = "Addressed in commit" marker).

## Step 4 — Identify the responsible team

Run `node .github/scripts/owners.mjs` against the changed file list and map the winning GitHub team to a Linear team. Full mapping table, sub-agent fallback procedure, and label rules: see `reference/teams.md`.

## Step 5 — Extract the Linear ticket

n8n-assistant leaves a comment on every community PR containing `This PR has been added to our internal tracker as "GHC-XXXX"`. Search the concatenated n8n-assistant comment body for `\bGHC-\d+\b`, take the first match.

If no n8n-assistant comment exists (older PRs that predate the automation), `linearTicket` is `null`.

## Step 5b — Find related issue tickets and detect duplicates

The PR body often says `Fixes #NNNN` / `Closes #NNNN` / `Resolves #NNNN` (or links to `https://github.com/n8n-io/n8n/issues/NNNN`). Each of those issues usually has its own GHC ticket (or has already been triaged to a team). When a PR references an issue, that **issue ticket** becomes the source of truth: the action paths link the PR onto it and (when ready) cancel the PR's own review ticket. Surface the related tickets and any duplicate PRs here so the action paths can act on them.

### Related issue tickets

1. Extract every issue number from the PR body matching `\b(?:fix(?:es)?|close[sd]?|resolve[sd]?)\s+#?(\d+)\b` (case-insensitive) **or** URLs matching `github\.com/n8n-io/n8n/issues/(\d+)`. Deduplicate.
2. For each issue number, search Linear with the available Linear MCP issue-search tool (query `github.com/n8n-io/n8n/issues/<num>`, limit 50) and filter the result to issues whose `description` contains the exact URL `https://github.com/n8n-io/n8n/issues/<num>`. The n8n-assistant bot embeds that URL in the description of every community-issue ticket it creates, so the match is reliable. Use the default limit of 50 (not a smaller value): the `query` is a substring search ordered by `updatedAt`, so `issues/<num>` also matches longer issue numbers (e.g. searching `123` matches `1234`) and the exact ticket can sit anywhere in the result set — a tight limit would silently drop it. If 50 results come back full, paginate with `cursor` until the exact match is found or results are exhausted.
3. Collect the matching ticket IDs (e.g. `GHC-1234`, or wherever they've been routed since — `NODE-5678`, `CAT-3338`). Include cancelled/duplicate tickets too — the link is still useful for traceability.

Emit the result as `relatedIssueTickets` in the JSON. If no `Fixes/Closes/Resolves` references exist, return `relatedIssueTickets: []`. The linking action itself lives in step 7 (see "Linking a PR to its issue ticket").

### Duplicate PRs

When a PR references an issue, another contributor may already have an open PR for the same issue. Gather candidate duplicates from three signals — any hit means the action path should ask whether to close this PR (path D, duplicate template). Run for each referenced issue number:

```bash
# Other open PRs mentioning the same issue
gh pr list --repo n8n-io/n8n --state open \
  --search "#<num> in:body" --json number,title,author

# PRs cross-referenced / linked on the GitHub issue itself
gh api --paginate "repos/n8n-io/n8n/issues/<num>/timeline" \
  --jq '[.[] | select(.event=="cross-referenced") | .source.issue
         | select(.pull_request) | {number, title}]'
```

Also inspect the matched Linear issue ticket (from the search above) for an already-attached PR link in its `links`/attachments. Exclude the PR under review from every signal, deduplicate by PR number, and emit the result as `duplicatePRs` in the JSON (`[]` when none).

## Step 6 — Output JSON

```json
{
  "readyForReview": <true if all passing checks allow merge, false otherwise>,
  "messageForUser": "<Short message to the contributor listing what they need to address. 'N/A' if ready.>",
  "team": "<Linear team name (from reference/teams.md), or 'Engineering' as fallback>",
  "linearTicket": "<GHC-XXXX or null>",
  "relatedIssueTickets": [<"GHC-1234" | "NODE-5678" | ...>],
  "duplicatePRs": [<{ "number": <int>, "title": "<string>" }, ...>],
  "checks": {
    "AutoReject": <"typo-only" | "new-node" | null>,
    "CLA": <bool>,
    "Title": <bool>,
    "Description": <bool>,
    "TestsNeeded": <bool>,
    "TestsIncluded": <bool>,
    "CubicIssues": <true if unresolved cubic issues exist, false otherwise>
  }
}
```

`readyForReview` is `true` only when: `AutoReject` is `null`; `CLA`, `Title`, and `Description` are all `true`; `CubicIssues` is `false`; and either `TestsNeeded` is `false` or `TestsIncluded` is `true`. If `AutoReject` is set, `readyForReview` is always `false`.

Emit the JSON first, then take the appropriate action path below.

## Step 7 — Action paths

Ask the user for each prompt (presented as the listed options). Sub-agents called for analysis only should stop after step 6 and let the caller drive step 7.

### Linking a PR to its issue ticket

Invoked from **B** and **C** whenever `relatedIssueTickets` is non-empty. The referenced **issue ticket** becomes the source of truth; the PR is attached to it via Linear's link feature. For each ticket in `relatedIssueTickets`, call the Linear MCP issue-update tool:

```text
id    = <issue ticket>
links = [{ url: "https://github.com/n8n-io/n8n/pull/<pr>",
           title: "Community PR #<pr>" }]   # append-only — existing links are preserved
```

Then post a comment (Linear MCP comment tool, `issueId = <issue ticket>`) whose wording depends on whether the PR is ready:

- **ready + assign (path B):** *"The linked community PR #<pr> may resolve this issue."*
- **not ready (path C):** *"A community PR (#<pr>) is in progress that may resolve this, but it is still being triaged."*

State and ticket-closure handling differ by path and are described in **B** and **C** below.

### A — Minor title fix

A title issue is **minor** if it can be repaired by a deterministic transformation:

- Leading or trailing whitespace.
- First letter of the summary in the wrong case.
- Trailing period.
- Mixed case `revert:` requiring lowercase (no change needed, just flag).

If the *only* failing check is `Title` (or `Title` + `CubicIssues`) and the issue is minor, propose the fix and ask `Apply proposed / Edit before applying / Skip`. Apply with:

```bash
gh pr edit <number> --repo n8n-io/n8n --title "<new title>"
```

Then re-evaluate `Title` (now passes) and continue to **B** or **C**. Non-minor title problems (wrong/missing type, no colon, hyphenated scope) need contributor input — skip A and go to **C**.

### B — Triage to team (`readyForReview === true`)

**Duplicate guard first.** If `duplicatePRs` is non-empty, surface them (number + title) and ask whether to close this PR as a duplicate. On `Yes`, go to **D** (duplicate template). On `No`, continue with B below.

Destination state: `Review` for NODES, `Triage` for every other team — keyed off the PR's resolved owner `team`. Label composition: see `reference/teams.md`.

**If `relatedIssueTickets` is non-empty — the issue ticket is the source of truth.** Ask: *"PR is ready for review. Link it onto issue ticket(s) `<relatedIssueTickets>`, move them to <destination state>, and cancel the PR's own ticket `<linearTicket>`?"* Options: `Yes, link and triage` / `No, leave as-is`. On `Yes`:

1. Run "Linking a PR to its issue ticket" (ready variant) for each related ticket.
2. Move **each** related issue ticket's state via the Linear MCP issue-update tool (`id = <issue ticket>`, `state = <destination>`) — `Review` for NODES, `Triage` otherwise.
3. Cancel the PR's own review ticket: Linear MCP issue-update with `id = linearTicket`, `state = "Canceled"` (skip if `linearTicket` is `null`).
4. Apply the GitHub PR labels (only if the Linear updates succeeded), so reviewers still find the PR:
   ```bash
   gh pr edit <number> --repo n8n-io/n8n \
     --remove-label "triage:in-progress" \
     --remove-label "status:pending-assignment" \
     --add-label "team:<slug>" \
     --add-label "status:team-assigned" \
     --add-label "triage:complete"
   ```

**Otherwise (no related issue ticket) — classic path, unchanged.** Ask: *"PR is ready for review. Assign Linear ticket `<linearTicket>` to team `<team>` and move to <destination state>?"* Options: `Yes, assign and triage` / `No, leave as-is`. On `Yes`:

```bash
# 1. Linear — call the available Linear MCP issue-update tool with:
#      id     = linearTicket
#      team   = <team>
#      state  = <destination>
#      labels = <computed labels>
# 2. GitHub (only if Linear succeeded) — see reference/label-flow.md
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --remove-label "status:pending-assignment" \
  --add-label "team:<slug>" \
  --add-label "status:team-assigned" \
  --add-label "triage:complete"
```

The PR's own review ticket is **not** canceled in the classic path — it remains the tracking ticket. If `linearTicket` is `null`, ask whether to create a new Linear ticket before triaging (older PRs predating n8n-assistant). Otherwise skip B and ask the user.

### C — Post contributor comment (`readyForReview === false`, no auto-reject)

If `relatedIssueTickets` is non-empty, run "Linking a PR to its issue ticket" (not-ready variant): add the PR link and post the "in progress, still being triaged" comment. **Leave each issue ticket's state unchanged and do not cancel the PR's own review ticket** — the PR isn't ready yet, so we only flag the in-progress work. (Optionally surface `duplicatePRs` to the user, but do not close here — closing is a path-D action driven from B.)

Show `messageForUser` and ask `Post as-is / Edit before posting / Skip`. On post:

```bash
gh pr comment <number> --repo n8n-io/n8n --body "<final message>"
```

Then apply the right terminal triage label — exactly one, priority `triage:tests-needed` > `triage:needs-info`. See `reference/label-flow.md`. On `Skip`, leave the PR on `triage:in-progress` so the next loop picks it up.

Skip C entirely if A already handled the only failing check and the PR is now ready — run B instead.

### D — Close the PR

Used when the PR should be closed rather than reviewed. Three common triggers:

1. **Auto-rejection** (`AutoReject` set) — typo-only or unsanctioned new node.
2. **Duplicate** — `duplicatePRs` is non-empty (another open PR addresses the same change), confirmed via the duplicate guard in path B. Use `#<other-pr>` from `duplicatePRs` in the template.
3. **Out of scope / bundled** — multiple unrelated fixes that should be split, or scope n8n team has declined.

Ask `Close + comment / Edit before closing / Skip`. Templates below; pick one and adapt to the contributor and specifics.

**Typo-only:**
> Thanks for taking the time to send this in! Per our [contributing guide](../blob/master/CONTRIBUTING.md#community-pr-guidelines) we don't accept typo-only PRs — they create review overhead without changing functionality, and our spell-checker rules cover most cases automatically. Closing this for now; please feel free to open a PR that pairs a typo fix with a related logic change. 🙏

**New node:**
> Thanks for the contribution! n8n no longer accepts new nodes directly into the core monorepo unless the team has explicitly agreed to scope one in. Please publish this as a [community node](https://docs.n8n.io/integrations/creating-nodes/overview/) instead — that gives you full ownership and avoids the long review queue here. Closing this PR per our [contributing guide](../blob/master/CONTRIBUTING.md#community-pr-guidelines).

**Duplicate of another PR:**
> Thanks for the contribution! This change is already being handled in #<other-pr>, which is further along in review. Closing this in favour of that PR to keep the queue tidy — please feel free to chime in over there if there's anything missing.

**Bundled / out of scope:**
> Thanks for the contribution! Per our [contributing guide](../blob/master/CONTRIBUTING.md#community-pr-guidelines) we ask for one focused change per PR. This PR bundles <N> unrelated fixes — please reopen them as separate, focused PRs, each with the [template](../blob/master/.github/pull_request_template.md) filled in and a unit test that locks in the regression. Closing this one in the meantime. 🙏

Close action (same for every reason):

```bash
gh pr comment <number> --repo n8n-io/n8n --body "<final message>"
gh pr close <number> --repo n8n-io/n8n
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --remove-label "status:pending-assignment" \
  --add-label "status:internal-closed" \
  --add-label "triage:complete"
```

If `linearTicket` is set, also cancel it with the available Linear MCP issue-update tool (`id=linearTicket`, `state="Canceled"`). If `gh pr close` reports the PR is already closed (contributor beat you to it), proceed with the comment, labels, and ticket cancellation anyway.

## Notes

- **Draft PRs** — report all findings but note the PR is a draft.
- **Already merged or closed** — say so and skip the checks (don't apply triage labels).
- **Re-reviewing a PR you've already commented on** — use the GitHub Timeline API to detect contributor activity since the last skill touch. See `reference/re-review.md`.
- **Label state machine** — single `triage:<state>` label at any time; transitions documented in `reference/label-flow.md`.
