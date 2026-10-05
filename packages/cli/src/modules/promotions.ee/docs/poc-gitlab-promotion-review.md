# POC: GitLab merge request as a Promotion Review

Ticket: https://linear.app/n8n/issue/LIGO-1231
Glossary: [`../CONTEXT.md`](../CONTEXT.md)

This file is the decision log for the POC. It is a working document. Challenge
any entry in the PR or in Linear. Each entry has a status:

- **Decided**: we build on it in the POC.
- **To be confirmed**: we build on it, but an external input can change it.
- **Finding**: a fact from the code that v1 must address. Not a POC decision.

## Questions the POC answers

1. Is the user journey acceptable with a synced MR review, or do we need a
   native Promotion Review in n8n?
2. What exactly do we need to implement for v1 (deadline: end of October)?

## Decisions

### 1. The visual diff is in scope — Decided

The review shows the list of changed workflow files and a per-workflow canvas
diff (`WorkflowDiffView`) between the Review Baseline and the MR head. Folder,
credential, and other entity changes show as counts only.

Reason: the diff is what n8n adds over GitLab. Without it, question 1 answers
itself as "use GitLab" and we learn nothing about the native alternative.

Stretch: bindings and dependencies tabs computed from the head package.

### 2. Branch off `poc-ligo-1063-add-gitlab-as-a-connection-type` — Decided

Base commit `f526cd2c9c8` ([PR #40304](https://github.com/n8n-io/n8n/pull/40304)).
Open the POC PR against that branch.

It already provides the `gitlab` provider type, provider config `{ baseUrl }`,
the enum-CHECK migration, `GitLabHostClient` on `OutboundHttp`, and
`PromotionProvidersService.hostAccess(provider)`. A shim on master would copy
these and get thrown away. Our touch points are additive (MR client, run
entity, controller, FE section), so rebases stay cheap. Building on it tests
whether the provider boundary fits MR operations, which feeds back into
LIGO-1063.

### 3. The entity is `promotion_run`, not `promotion_review` — Decided

A Promotion Run is one execution of Promote. The Promotion Review is the gate
on it (the MR, in the POC). See the glossary.

| column | why |
|---|---|
| `id` | n8n identity, routes |
| `connectionId` (FK, cascade) | which GitLab host, token, and repository |
| `mergeRequestIid` (int) | the MR, scoped to the GitLab project |
| `gitlabProjectId` (int) | numeric id from MR create; survives renames |
| `createdById` (uuid, SET NULL) | the requester, without parsing MR text |
| `createdAt` | inbox ordering without a GitLab call |

No status column. Title, state, branches, URL, author, and conflicts come from
GitLab on load. The POC writes a row only when it opens an MR.

Rejected: "ID + MR reference" alone. An MR `iid` is scoped to a GitLab
project, and the token and base URL come from the provider, so `connectionId`
is the minimum that lets n8n re-find the MR. Rejected: a JSON `externalRef`
column (provider-neutral, but no FK semantics; revisit when a second host
type exists).

### 4. Promotion Reviews are interleaved with Workflow Reviews — To be confirmed

Interleaved in one list, ordered by creation time, under the same Open and
Closed tabs. Each source keeps its own API, store, pagination, permissions,
detail view, and actions. The view merges on the client. POC: load all open
Promotion Reviews and merge them into the first page. v1: cursor-aware k-way
merge.

Reason: for an instance admin every review is a task of the same rank. The
type is a property of the row, not a heading.

**Why "to be confirmed":** the Assistant team adds a third review type
([ASS-1517](https://linear.app/n8n/issue/ASS-1517)) and plans grouped sections
per source with no merged feed. We want to see their inbox source contract
before we fix this. If it supports only grouped sections, we either adopt
grouping or ask for an interleaved presentation on top of the contract.
ADR: [`adr/ADR-20261005-interleave-promotion-reviews-in-the-review-inbox.md`](adr/ADR-20261005-interleave-promotion-reviews-in-the-review-inbox.md).

### 5. Approve in n8n = note + approve + merge in GitLab — Decided

1. Post an MR note "Approved in n8n by <name> (<email>)". Every write with the
   group access token shows the group bot in GitLab; the note keeps the human.
2. Call `approve`. Treat 401 (author approval blocked) and "already approved"
   as success.
3. Call `merge` with `should_remove_source_branch: true` and a merge commit
   message that names the approver. Return GitLab's message verbatim on
   405/409 (not mergeable, conflicts, pipeline, approvals missing).

No n8n state change; the next load reads `merged`. No reject or close action
in the POC. The detail view links to GitLab for everything else.

### 6. The diff reads from the promote Config's checkout; n8n computes the baseline — Decided

The review lives on the Source Instance, which always has a promote Config
and its checkout.

Flow: `fetchBranch(source_branch)` and `fetchBranch(base)`,
`git merge-base origin/<base> <head_sha>` as the Review Baseline, `ls-tree` at
baseline and head, `diffPackageFiles`, `readFilesAtCommit` per workflow on
click. All inside the existing per-config `lockCheckout`.

Reasons:

- The clone is full history (`--single-branch --no-tags`, no `--depth`), so
  every ancestor of head is local after one fetch.
- `listBranchTree`, `readFilesAtCommit`, `parseBaseBranchFiles`, and
  `diffPackageFiles` exist and are tested.
- GitLab's `diff_refs.base_sha` goes stale when the base branch moves. The
  GitLab `/diffs` API reads that same stale sha, so the API does not fix the
  baseline worry; computing the merge base ourselves does.

The detail view shows the baseline sha. Merged reviews still render (commits
reachable from base). A closed MR with a deleted branch shows the GitLab link
only.

### 7. Permissions: `@GlobalScope('gitConnection:push')` on every route — Decided

Members hold no `gitConnection:*` scope (`GLOBAL_MEMBER_SCOPES`), so this is
"instance owner or admin" without a new scope.

### 8. Which MRs count, and sync — Decided

A Promotion Review exists if and only if a `promotion_run` row exists. MRs a
human opens on a promotion branch are not reviews. State is read from GitLab
on every list and detail load. No webhooks, no stored state.

### 9. Several open Promotion Reviews per connection; no policy — Decided

GitLab is the arbiter. `has_conflicts` blocks approve, and the detail shows
"a newer Promotion Review exists on this connection" when a later run exists.

Rejected: block Promote while a review is open (kills the normal multi-author
case with disjoint workflows). Rejected: supersede older runs (needs file-set
overlap, which is a diff, not a flag). "1 MR per connection" is out for v1
unless the POC shows otherwise.

### 10. MR content and the failure path — Decided

- Title: first line of the user's commit message; fallback
  `n8n promotion <date>`.
- Description: requester name and email, source instance URL, entity counts,
  commit message body. No machine-readable footer; the entity carries identity.
- Options: `remove_source_branch: true`, `squash: false`. No assignee,
  reviewers, or labels.
- If MR creation fails after the push: the promotion succeeds, the result
  carries `warnings: [{ code: 'merge-request-not-created', message }]`, the
  dialog shows it with the branch name, and no `promotion_run` row is written.
- No backlink from the MR to n8n in the POC.

### 11. Promotion Reviews use their own state vocabulary — Decided

| GitLab | n8n tab | label | dot colour |
|---|---|---|---|
| `opened`, `locked` | Open | Open | as `pending` |
| `opened` + `has_conflicts` | Open | Open, blocked: conflicts | as `pending`, warning glyph |
| `merged` | Closed | Merged | as `approved` |
| `closed` | Closed | Closed without merge | as `changes_requested` |

The colours map to Workflow Review colours; the semantics do not.
`detailed_merge_status` shows only in the detail as the reason Approve is
disabled.

Row: title, kind icon, requester, time ago. Detail: title, source → base,
Review Baseline sha, requester, GitLab author, created, state, conflicts,
"newer review exists", Open in GitLab, changed workflows with status,
other-entity counts, Approve and merge.

## Findings

- Promote exports with `WorkflowVersionPolicy.Latest`
  (`promotions.service.ts:207`, `:308`). The MR and the review diff compare
  latest saved versions (drafts), not published versions. v1 must decide
  whether that is the intended review surface.
- `parseAllProjectWorkflowFiles` from last week's notes does not exist. The
  helpers are `parseBaseBranchFiles` / `parsePackageFiles`
  (`base-branch-files.ts`) and `diffPackageFiles`.
- The connection target stores only `remoteUrl`. The GitLab project path is
  derived from `remoteUrl` minus `baseUrl` minus `.git` until an MR exists;
  after that `gitlabProjectId` is used.

## Build order

1. Migration, `PromotionRun` entity and repository (`promotions.ee/database/`).
2. `GitLabMergeRequestClient` next to `GitLabHostClient`: `createMergeRequest`,
   `getMergeRequest`, `createNote`, `approve`, `merge`. `nock` tests.
3. Hook in `promote()` / `promoteSelectionResolved()` after `commitAndPush`:
   create the MR, write `promotion_run`, extend `promotePackageResultSchema`
   with `mergeRequest?` and `warnings`.
4. Review read model: `GET /rest/promotions/reviews?state=`,
   `GET /rest/promotions/reviews/:runId`,
   `GET …/reviews/:runId/workflows/:workflowId/diff`.
5. `POST /rest/promotions/reviews/:runId/approve`.
6. FE: `promotionReviews.store.ts` and api, interleave into
   `WorkflowReviewRequestsView.vue`, row kind, `PromotionReviewDetail` that
   reuses `WorkflowReviewChangesSection`.
7. Manual demo against local GitLab (Docker, group access token). Record it.
8. Stretch: bindings and dependencies tabs; MR notes in the detail.

## Follow-ups outside the POC

- Read ASS-1517's inbox source contract when it exists; confirm or revise
  decision 4.
- v1: cursor-aware k-way merge in the inbox; "link existing MR" for runs
  whose MR creation failed; decide the version policy for Promote.
