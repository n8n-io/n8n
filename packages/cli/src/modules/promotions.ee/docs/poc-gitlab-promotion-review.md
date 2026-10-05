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

The POC takes the v1 shape of the table. Revised after E6/E7: the first cut
had no status column and derived everything from GitLab on load. That cannot
serve the Open and Closed tabs (decision 11) without one GitLab call per run
ever made, and it loses history when the MR or the connection is deleted.

**Rule:** GitLab is authoritative while a run is open; n8n is authoritative
once the run is terminal. `merged` and `closed` never change in GitLab, so a
terminal row is never re-read. Only open rows are refreshed.

| group | columns | why |
|---|---|---|
| identity | `id`, `connectionId` (FK, **SET NULL**), `projectId` (nullable), `createdById` (SET NULL), `createdAt` | row survives connection deletion; project-scoped promote; requester |
| the run | `branchName`, `commitSha`, `title` | n8n facts known at promote time |
| the review ref | `gitlabProjectId`, `mergeRequestIid`, `webUrl` | re-find the MR; link even when GitLab is unreachable |
| state cache | `state` (`open`, `merged`, `closed`, `unavailable`), `hasConflicts`, `lastSyncedAt`, `mergedAt`, `closedAt` | tabs and sorting from the DB; refresh only while `open` |
| n8n audit | `approvedById`, `approvedAt` | who clicked Approve in n8n; GitLab only sees the bot |

The POC writes a row only when it opens an MR.

Rejected: "ID + MR reference" alone. An MR `iid` is scoped to a GitLab
project, and the token and base URL come from the provider, so `connectionId`
is the minimum that lets n8n re-find the MR. Rejected: a JSON `externalRef`
column (provider-neutral, but no FK semantics; revisit when a second host
type exists). Rejected: derive-only with no status column (see above).
Rejected: cache only (`state`, timestamps) and defer `projectId`,
`commitSha`, `approvedById` to v1: five nullable columns are not worth a
second migration, and `approvedById` is what makes the n8n review an audit
record.

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
human opens on a promotion branch are not reviews.

Sync: refresh-on-read for open rows, on list and detail load, one GitLab call
per open run per load. Terminal rows are never re-read. A 404 on an open row
sets `unavailable`. No webhooks in the POC; they are a v1 optimisation, not a
dependency.

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
| row `unavailable` (404 on an open run, or connection deleted while open) | Closed | Not found in GitLab | neutral |

Tabs and ordering come from the stored `state` and `createdAt`, not from
GitLab. The colours map to Workflow Review colours; the semantics do not.
`detailed_merge_status` shows only in the detail as the reason Approve is
disabled.

Row: title, kind icon, requester, time ago. Detail: title, source → base,
Review Baseline sha, requester, GitLab author, created, state, conflicts,
"newer review exists", Open in GitLab, changed workflows with status,
other-entity counts, Approve and merge.

## Edge cases and permissions

### E1. The inbox exists only when Workflow Reviews is on — Decided

`/reviews` is gated on `isWorkflowReviewsEnabled` (license and the
`workflowReviews.enabled` setting). An instance with GitLab promotion but
without Workflow Reviews has no inbox, so a Promotion Review has no home.

POC: both features must be on. This is a documented constraint. v1: the inbox
route exists when any registered source is available; raise this on ASS-1517's
shared inbox shell rather than widening the Workflow Reviews route gate now.

### E2. The requester cannot approve their own Promotion Review — To be confirmed

Every promote route requires `gitConnection:push`, so in the POC the requester
is always an owner or admin, and owners and admins are the only approvers.
Without a rule, a single admin requests and approves every run alone.

POC: `viewerCanApprove = isAdmin && run.createdById !== viewer.id`. The detail
shows the reason when it is false. The rule matches Workflow Reviews ("the
author cannot decide") so the shared inbox stays coherent. The demo instance
needs two admin users.

**Why "to be confirmed":** this is a product rule with consequences for
one-admin instances (the run can then only be merged in GitLab). Open a
discussion with the team before v1. Alternatives: allow with a "you requested
this" label; block with an owner override.

### E3. GitLab providers need the `api` token scope — Decided

`read_api` + `write_repository` (the README on the base branch) covers clone,
promote, and apply. MR create, note, approve, and merge are API writes and
need `api`. A token set up per the README would fail at MR creation with a
403 on every promotion, surfaced only as the decision 10 warning.

POC: validate the scope at provider save time with
`GET /personal_access_tokens/self` (works for group and project tokens,
GitLab 16.0+). Reject the save and name the missing scope. On older GitLab,
skip the check. At MR creation, map the 403 to a clear "token lacks `api`
scope" warning as the runtime fallback, because tokens can be rotated to a
weaker one later. Rule for the docs: `api` + `write_repository`, Maintainer
role. Feed this back into LIGO-1063 (PR #40304) so the README and
`validateAccess` change there.

### E4. Token role too low; token expired or revoked — Decided

- A source failure never breaks the inbox. The promotion source returns
  `{ items: [], error: { code: 'gitlab-auth' | 'gitlab-unreachable', message } }`.
  The view renders the other rows plus one inline banner row ("Promotion
  reviews unavailable: …", link to provider settings). Counts exclude the
  failed source; the badge shows a warning glyph.
- Role problems surface at the action, not at load. `getMergeRequest` works
  with Developer, so the review renders. Approve returns GitLab's message
  verbatim plus one n8n sentence ("The GitLab token needs the Maintainer role
  on `<base>`"). No pre-flight role check: the answer depends on the
  protected-branch rules, which only GitLab knows.
- Token expiry: read `expires_at` from the same E3 call at save time and show
  "expires in N days" on the provider card.
- While the token is broken, open rows render from the cache with a
  "last synced N minutes ago" hint and Approve disabled. Fixing the token
  fixes the next load; no repair step.

### E5. MR deleted in GitLab while the row remains — Decided

A 404 on an open run sets `state = unavailable`. The row moves to the Closed
tab with the label "Not found in GitLab" and renders the stored facts
(title, requester, created, branch, link). Terminal rows are never re-read,
so a deleted merged MR keeps rendering from the cache. No delete or dismiss
action in the POC; v1 decides between dismiss and automatic cleanup.

### E6. Connection deleted — Decided

`connectionId` is SET NULL, not cascade. Terminal rows render from the cache.
Open rows flip to `unavailable` because there is no host or token left to
read them with. History survives a connection being recreated against a new
repository.

### E7. Commit message starts with `Draft:` or `WIP:` — Decided

GitLab marks the MR as a draft and refuses to merge. We do not rewrite the
user's title. `detailed_merge_status = draft_status` shows in the detail as
the reason Approve is disabled, with "Mark as ready in GitLab".

### E8. Two admins approve at the same time — Decided

The approve endpoint claims the row first with a conditional update
(`SET approvedById, approvedAt WHERE id = ? AND state = 'open' AND
approvedById IS NULL`). The loser gets 409 "already being approved". If
GitLab answers 405 "already merged" to the winner, treat it as success and
refresh. If the merge fails, clear the claim so a retry is possible.

### E9. Inbox list is N+1 against GitLab — Decided

Only open rows are refreshed (decision 3). Batch them per GitLab project with
`GET /projects/:id/merge_requests?iids[]=…` (one call per project per load).
Terminal rows cost nothing.

### E10. Checkout missing or stale on the instance that serves the request — Decided

The diff endpoint reuses `assertCheckoutReady`. If the promote checkout is
missing (after Disconnect) it returns `{ code: 'checkout-missing' }`; the
detail renders metadata and the GitLab link, and the changes section shows
"Reconnect the promote configuration to see the diff". Multi-main: checkouts
live on each main's filesystem, so a main without the checkout cannot render
the diff. This is an existing limitation of promotions, not of the POC. Noted
under findings.

### E11. Requester or approver deleted — Decided

`createdById` and `approvedById` are SET NULL. Rows show "Deleted user".

### E12. Project-scoped promote — Decided

`projectId` is stored (decision 3) but not used for visibility in the POC:
instance owners and admins see every run. v1 decides whether project admins
see their project's runs.

## Findings

- Promote exports with `WorkflowVersionPolicy.Latest`
  (`promotions.service.ts:207`, `:308`). The MR and the review diff compare
  latest saved versions (drafts), not published versions. v1 must decide
  whether that is the intended review surface.
- `parseAllProjectWorkflowFiles` from last week's notes does not exist. The
  helpers are `parseBaseBranchFiles` / `parsePackageFiles`
  (`base-branch-files.ts`) and `diffPackageFiles`.
- Multi-main: promotion checkouts are per-main filesystem state. Any read of
  a checkout (change preview, review diff) depends on which main serves the
  request. Pre-existing; the review diff inherits it.
- The connection target stores only `remoteUrl`. The GitLab project path is
  derived from `remoteUrl` minus `baseUrl` minus `.git` until an MR exists;
  after that `gitlabProjectId` is used.

## Build order

1. Migration, `PromotionRun` entity and repository (`promotions.ee/database/`). — Done
2. `GitLabMergeRequestClient` next to `GitLabHostClient`: `createMergeRequest`,
   `getMergeRequest`, `listMergeRequests`, `createNote`, `approve`, `merge`.
   Unit tests mock `HttpRequestClient`. — Done
3. Hook in `promote()` / `promoteSelectionResolved()` after `commitAndPush`:
   create the MR, write `promotion_run`, extend `promotePackageResultSchema`
   with `mergeRequest?` and `warnings`. — Done
4. Review read model: `GET /rest/promotions/reviews?state=`,
   `GET /rest/promotions/reviews/:runId`,
   `GET …/reviews/:runId/workflows/:workflowId/diff`. — Done
5. `POST /rest/promotions/reviews/:runId/approve`. — Done
6. FE: `promotionReviews.store.ts` and api, interleave into
   `WorkflowReviewRequestsView.vue`, row kind, `PromotionReviewDetail`. — Done
7. Manual demo against local GitLab (Docker, group access token). — Set up,
   see "Manual demo". Recording still open.
8. Stretch: bindings and dependencies tabs; MR notes in the detail.

## Implementation notes

Where the code differs from the plan above:

- `PromotionReviewDetail.vue` renders the diff with `WorkflowDiffView`
  directly, not with `WorkflowReviewChangesSection`. The review section is
  bound to a `WorkflowReviewRequest` and its version pair. The diff view only
  needs two `IWorkflowDb` objects, so it fits the promotion read model
  without an adapter layer.
- The baseline is `git merge-base <headSha> origin/<targetBranch>` on the
  promote checkout, after a `git fetch origin <targetBranch>`
  (`PromotionsGitService.readReviewTrees`). The service compares blob SHAs of
  `n8n-export/projects/<project>/workflows/<slug>-<id>/workflow.json` on both
  trees to classify `added`, `modified` and `deleted`. The frozen
  `baselineCommitSha` on the row is the fallback when the fetch fails.
- Approve claims the row first (`PromotionRunRepository.claimApproval`, a
  conditional update on `approvedById IS NULL`) and releases the claim if the
  GitLab call fails. This is the E8 guard.
- Inbox rows carry the route id `promotion:<runId>`; Workflow Review rows keep
  their plain id. `WorkflowReviewRequestsSidebar.vue` merges both into one
  list sorted by `createdAt`. The merge happens client side on the loaded
  pages, not on a shared cursor (follow-up for v1).
- Open runs are synced from GitLab with one `GET /merge_requests?iids[]=`
  per project on every inbox load (`PromotionReviewsService.list`). A 404
  marks the run `unavailable`.

## Manual demo

Prerequisites: a GitLab project reachable from the instance, a token with
`api` scope and at least Maintainer role, and a license with the
`workflow-reviews` and `git-connections` features (both modules are
license-gated; see decision E1). The `promotions` module is not a default
module: start the instance with `N8N_ENABLED_MODULES=promotions` and the
rollout flag `N8N_ENV_FEAT_PROMOTIONS=true`. The inbox shows Promotion
Reviews only when both are set and the viewer has `gitConnection:read`
(the same gate as the Promotions settings page). Otherwise it makes no
promotion request, and a `promotion:` deep link lands on "Review not found".

### Local setup used for the POC

The demo runs against a local GitLab CE 18.9 container on
`http://localhost:8929` and a copy of the developer's `~/.n8n` data in
`~/.n8n-promotion-demo/.n8n` (`N8N_USER_FOLDER` is the parent of `.n8n`). The
copy keeps the encryption key, the license and the users, so the real data
folder stays untouched. Files next to it hold the secrets: `gitlab-token`
(a PAT with `api` scope), `n8n-api-key` (a public API key with the
`gitConnection:*` scopes) and `admin-password` (a demo password for a test
admin account, set in the copy only).

```bash
cd packages/cli
N8N_USER_FOLDER=$HOME/.n8n-promotion-demo \
N8N_ENABLED_MODULES=promotions N8N_ENV_FEAT_PROMOTIONS=true \
N8N_RUNNERS_ENABLED=true N8N_RUNNERS_BROKER_PORT=5699 \
./bin/n8n start
```

The instance connection `Local GitLab` points at
`promote-demo-1787588222/promotion-reviews-poc` with Promote on `main` and
branching on. Two runs exist: MR !1 (every team project, merged in GitLab to
seed the baseline) and MR !2 (one modified workflow, open, ready for the
"Approve and merge" step).

To create a new run from the shell:

```bash
curl -s -H "X-N8N-API-KEY: $(cat ~/.n8n-promotion-demo/n8n-api-key)" \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:5678/api/v1/promotions/connections/djL7S3BLv0JcA8X2/promote \
  -d '{"commitMessage":"<title of the merge request>"}'
```

### Script

1. Create a GitLab promotion connection and a promote config for a project.
2. Change a workflow in that project and run Promote.
3. Expect: the promote result shows `mergeRequest.webUrl`; GitLab shows an
   open MR from `n8n-promotion/<timestamp>` to the target branch; the row in
   `promotion_run` has `state = 'open'`.
4. Open `/reviews`. Expect a `Promotion` row in "Waiting for review" next to
   the Workflow Reviews. Select it. Expect the MR link, branch metadata and the
   list of changed workflows with `Added`, `Modified` or `Deleted` badges.
5. Select a workflow. Expect the node-level diff between the merge-base and
   the promoted commit.
6. Click "Approve and merge". Expect a note and an approval on the MR, the
   MR merged, the source branch removed, and the row moved to "Closed" with
   state `Merged`.
7. Negative path: close an MR in GitLab, reload `/reviews`. Expect the row
   in "Closed" with state `Closed`. Delete an MR, reload. Expect state
   `Unavailable`.

Steps 1 to 5 and the "merged in GitLab" half of step 7 are verified on the
local setup. Step 6 is left for the live demo.

### Findings from the first run

- The batch sync sent `iids[][0]=1`, which GitLab answers with an empty
  list. Every open run was marked `unavailable` on the first inbox load.
  Fixed with `arrayFormat: 'brackets'`. A contract test against a real
  GitLab would have caught this; the unit test only mirrored the request.
- `unavailable` is terminal. A wrong or transient empty answer from GitLab
  freezes the row, and only a manual database edit recovers it. v1 should
  retry `unavailable` rows on sync, or only mark a row after a 404 on the
  single-MR route.
- The "Open" and "Closed" tab counters count Workflow Reviews only. The
  Promotion rows are in the list but not in the number.
- The public API key created in the UI expires. A legacy `n8n_api_` key
  inserted in the database does not, which is what the demo uses.

## Follow-ups outside the POC

- Read ASS-1517's inbox source contract when it exists; confirm or revise
  decision 4.
- v1: cursor-aware k-way merge in the inbox; "link existing MR" for runs
  whose MR creation failed; decide the version policy for Promote.
