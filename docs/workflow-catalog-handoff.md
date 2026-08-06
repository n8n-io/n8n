# Handoff: Workflow Catalog

**Branch:** `spike-catalog-runner-identity` (from `origin/master`, not pushed)

---

## Goal

Let non-technical people run workflows without opening the editor. A tab lists
the workflows they may run; they either run one now or set up their own schedule
for it. Everything executes against **their** connected accounts.

## Core architectural decision

The builder authors **one** workflow with an **Execute Workflow Trigger** and no
schedule of its own. Its input schema doubles as the contract a run form is
built from.

**Rejected: generating a wrapper workflow per subscriber** (a Schedule Trigger +
Execute Workflow node created on subscribe). Reasons, in order of weight:

1. **Two executions per run** (wrapper + target). The consumer sees both and
   can't tell which is theirs — a regression in the exact UX being built.
   Retention and quotas double-count.
2. **Clutter is a permanent tax.** Hiding generated workflows means remembering
   a filter in every list, search, export, source-control sync and insights
   query, including ones written later.
3. Caller policy denies it by default (`workflowsFromSameOwner`), version drift
   across N wrappers, orphan cascade on user removal, users can open and break
   their own wrapper.
4. It doesn't solve the hard problem anyway — a cron at 3am has no session
   either way.

**Instead:** a subscription row provisioned into n8n's existing durable
scheduler.

## Data model (two layers, agreed)

```
workflow_credential_binding          -- consent: "run as me"
  PK (workflowId, userId)
  workflowId FK → workflow_entity ON DELETE CASCADE
  userId     FK → user            ON DELETE CASCADE
  status     'active' | 'revoked'
  consentAt

workflow_subscription                -- personal schedule, N per binding
  id PK
  (workflowId, userId) FK → workflow_credential_binding ON DELETE CASCADE
  cronExpression, timezone, inputs (json), enabled
```

Why two: the composite PK is right for consent (one grant per pair) and wrong
for schedules (one person may want two schedules for the same workflow).
**Manual runs need no binding** — the person is present, so their session is the
identity, encrypted onto the run the same way the editor's manual execution does
it. The binding exists only for the unattended case, where there is no session
to take.

**Schedules need an Execute Workflow Trigger; manual runs do not.** A manual
trigger is enough to justify running something once with the person watching —
anyone with execute access could have run it from the editor anyway. A schedule
is unattended, recurring and acts with their accounts indefinitely, which is too
large a commitment to infer from the mere presence of a start node. So a
manual-trigger workflow appears in the catalog and can be run, but its schedule
button is disabled with an explanation.

**Trap:** the DB cascade will not deprovision scheduler jobs. Deprovision
explicitly in the service before deleting rows.

---

## What is built

| Commit | Content |
| --- | --- |
| `bb91a9163d0` | **Spike:** identity for an unattended user-bound run |
| `0a36cf18a7d` | Input-contract reader, extracted from `nodes-base` into `n8n-workflow` |
| `f78b151d7f2` | `POST /catalog/workflows/:id/run` |
| `1c7cde1ae96` | `GET /catalog/workflows` |
| `32fb2405e58` | `GET /catalog/runs` — since removed, superseded by the workflow's own execution list |
| `d400001ec62` | Frontend `/catalog` tab |
| _(uncommitted)_ | Binding + subscription tables, scheduler owner scope, schedule UI |

### Spike (identity)

- `ExecutionContextService.buildScheduledTriggerCredentials`
  (`packages/core/src/execution-engine/execution-context.service.ts`)
- `ScheduledTriggerIdentityService` — mints/verifies a short-lived signed token
  (`packages/cli/src/modules/dynamic-credentials.ee/credential-resolvers/identifiers/scheduled-trigger-identity.ts`)
- Four checks in `N8NIdentifier.resolveScheduledTrigger`: token signature+expiry
  → user enabled → binding active → **`workflow:execute` still granted**
- `AccessService.hasExecuteAccess` added alongside existing read/write
- `runner-binding.service.ts` now reads the `workflow_credential_binding` row
  (the in-memory stub is gone)

### Backend catalog

- `WorkflowInputSchemaService` — answers eligibility and schema together
- `CatalogRunService` — start node, production mode, input filtering, execution
  tagging
- `CatalogService` — listing
- `CatalogController` at `/rest/catalog`

### Frontend

`packages/frontend/editor-ui/src/features/catalog/` — module descriptor, api,
store, `CatalogView.vue`, i18n keys in `en.json`.

---

## Codebase findings that shaped this

**The durable scheduler already exists** (`packages/cli/src/scheduling/`).
Cron/interval/one-off, IANA timezones, misfire policy, retries, leasing, reaper.
Crucially `ScheduledJob.workflowId` is **nullable with no FK** — documented for
jobs not tied to a workflow. `registerTaskHandler(taskType, handler)` is an open
registry. **So workflow activation, multi-main and leadership change are
entirely out of scope.**

**There is no `mode === 'manual'` guard to relax.** `execution-context.ts:129`
picks up `encryptedRunnerIdentity` unconditionally; `workflow-runner.ts:378`
assigns it unconditionally. Scheduled runs lack identity only because nobody
sets the field on that path.

**Sub-workflows inherit the parent's credential context** — documented in
`execution-context.ts`. Free.

**Stored sub-workflows validate credentials against their own project**, not the
caller (`workflow-execute-additional-data.ts:552-556`). Static creds and
per-user dynamic creds don't conflict.

**Execute Workflow Trigger v1.0 has no `inputSource` parameter** (gated
`@version >= 1.1`), so it declares nothing and reads as passthrough — the same
as a 1.1+ trigger set to "Accept all data". Both are offered, with no fields:
declaring nothing is a workflow that takes no input, not one that can't be
offered, and it is the same position as a declared contract with nothing in it.

**`findAllWorkflowsForUser` already existed** in `WorkflowFinderService` and
returns `{...workflow, projectId}` — one row per share path, so dedupe at the
call site. It also skips its own narrowing entirely when the caller holds the
scope globally, which turned an instance owner's catalog into every workflow on
the box. The catalog passes `sharedWithUserOnly` to keep the narrowing on:
holding a global scope is an administrative capability, not a statement that
someone was given a workflow.

**Caller policy does not protect a direct run.** It only applies to
`executeWorkflow`. The sole protection is the `workflow:execute` scope. Accept
deliberately.

---

## Verified end to end

Walked on a live sqlite instance (`N8N_SCHEDULER_ENABLED=true`), against a
workflow with an Execute Workflow Trigger v1.1 declaring one field:

- both migrations apply; composite FK, enum CHECK and partial index land as
  written
- `GET /catalog/workflows` returns the entry with its `trigger` and `fields`,
  and no graph
- `POST .../run` executes in `trigger` mode; undeclared input keys are dropped;
  the execution carries `catalogRunUserId`
- `POST .../subscriptions` writes the grant, the row and one `scheduled_job`
- **the schedule actually fired**: the occurrence produced a second execution
  with the dedup key `<jobId>:<scheduledFor>`, the stored inputs, and the same
  attribution
- pause removes the job and keeps the row; resume re-provisions with the new
  cron; delete deprovisions then deletes
- revoking consent takes both schedules down, deletes both rows, and leaves the
  binding as `revoked`

**Two real bugs the walkthrough caught**, both invisible to the mocked tests:

1. `scheduled_job.workflowId` is a foreign key onto `workflow_published_version`,
   not `workflow_entity`. Stamping it on a subscription job failed the
   constraint on every create, because a catalog workflow is never published.
   Owner-scoped jobs now record no `workflowId` at all, and the type makes it
   impossible to pass one.
2. The task handler loaded the subscriber with a bare `findOne`, so the access
   check blew up on `AuthPrincipal does not have a role defined`. There is now
   `UserRepository.findOneWithRole` for acting on behalf of someone who is not
   present.

Still not covered: the real OAuth path (module is behind
`LICENSE_FEATURES.DYNAMIC_CREDENTIALS` + `N8N_ENV_FEAT_DYNAMIC_CREDENTIALS`,
needs a live account), and multi-user scoping (needs sharing/projects, both
licensed).

---

## Open decisions

1. **`N8N_SCHEDULER_ENABLED` defaults to `false`** and the durable scheduler
   only runs on a main instance. With it off, subscriptions are still created
   and their jobs written — they simply never fire, silently. Either the
   feature requires the flag, or the UI has to say so.
2. ~~Widen `ProvisionScope`~~ — done. `scheduled_job` gained a nullable,
   opaque `ownerId`, paired with `taskType` and carrying no foreign key;
   `provisionForOwner` / `deprovisionOwner` are the owner-scoped API. **Needs
   the scheduler owners' review**: it touches their table and their service.
3. ~~Handler registration~~ — done the way the existing two are, by constructor
   injection into `DurableScheduler`. Still worth asking them whether a feature
   module should get a registration seam instead of a fourth constructor arg.
4. TTL of the minted token — must survive queueing and task redelivery (lease
   and misfire grace both default to 60s), currently 15 min.
5. Quotas: `MAX_SUBSCRIPTIONS_PER_USER` is a constant (20) in
   `catalog-subscription.service.ts`. Should it be instance config, and is
   there a per-instance ceiling too?
6. Node copy (see below) — run through the `n8n:content-design` skill.
7. The schedule picker offers hourly/daily/weekly only. A cron set through the
   API that the picker cannot express reads back as the default in the form —
   deliberate, but it means the UI can silently misrepresent an API-made
   schedule until someone saves it.

---

## Remaining work, in order

1. **Offline OAuth refresh.** `grep refresh_token` over `dynamic-credentials.ee`
   still returns nothing outside tests. Manual runs are unaffected; **schedules
   will break after the first token expiry**, so this blocks shipping them.
2. **Node presentation** (not started, ~30 min, independent). In
   `ExecuteWorkflowTrigger.node.ts`: `defaults.name` (line 36)
   `'When Executed by Another Workflow'` → `'When Executed'`; rewrite
   `description` (line 31), which currently says "for calling other n8n
   workflows" and is the source of the confusion; leave `displayName` alone; add
   `alias` to the `.node.json` (mechanism used by Schedule Trigger) — not
   `Schedule`, it collides.
3. **Consent UI.** The grant is recorded implicitly when someone sets up their
   first schedule, and withdrawn through
   `DELETE /catalog/workflows/:id/consent`, which nothing in the UI calls yet.
   Someone can start running workflows as themselves without ever being shown
   what that means.
4. **The `workflow-executed` event** is emitted by
   `schedule-trigger-task-handler.ts` but not by the subscription handler, so
   scheduled catalog runs are missing from insights.
5. **Multi-main.** Provisioning writes from whichever main serves the request
   and the loops claim on every main, so this should be fine — but it has only
   been run single-main.

Also unresolved: a workflow with an Execute Workflow Trigger can't be activated,
so the builder sees "Active" off and assumes breakage. Needs a separate
"published to catalog" indicator.
