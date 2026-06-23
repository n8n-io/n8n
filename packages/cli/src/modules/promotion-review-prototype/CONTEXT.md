# Cross-Instance Promotion

The domain for promoting workflows (and their dependencies) from one n8n
instance to another — e.g. `dev` → `prd`. Covers the "request to promote",
how it travels between instances, and how the target reviews and applies it.
This is the context being explored by the push/pull spike.

## Language

**Promotion**:
Moving a workflow version (plus its dependencies) from a source environment to
a downstream environment so it can run there.
*Avoid*: deploy (overloaded), transfer (means ownership move in n8n).

**Promotion request**:
Intent created by a producing instance asking that a **deployable** be promoted
to a downstream environment. It references the deployable by **content hash +
transport locator** and carries the deployable's **manifest** (workflow names,
credential requirements, summary) so the staging area can render credential gaps
cheaply.
*Avoid*: PR (collides with git pull request), deployment.

**Deployable**:
An immutable, content-addressed snapshot of a workflow (plus its dependency
closure: credential requirements, and later sub-workflows/variables/data tables)
built when a user "marks for deployment". Frozen at mark time so ongoing edits
on the producing instance don't change what the consuming instance reviews and
applies. The unit a **promotion request** references. For v1 the closure is
**workflow-rooted** (user selects a workflow; the deployable is that workflow +
its transitive dependencies). Project/folder granularity is a later
root-selection mode over the same deployable model.

Because it is content-addressed and transport-neutral, **where a deployable
physically lives during review is a property of the transport**: served by the
producing instance (**direct**, v1 — producing instance must be reachable at
review time), or published to an intermediary where it **lives between the
instances** (**shared store / git** — producing instance may be offline).

**Producing instance**:
The instance where the workflow is built and the promotion request originates
(e.g. `dev`). *Avoid*: source (ambiguous with package `sourceId`).

**Consuming instance**:
The instance that receives a promotion request, reviews it, and applies it
(e.g. `prd`). *Avoid*: target, destination (use only when unambiguous).

**Source connection**:
Configuration held on the **consuming instance** identifying where to pull
promotion requests and deployables from. For the v1 **direct** transport this is
the **producing instance**: `{ producing instance base URL, scoped read-only API key }`, key issued on the producing instance and scoped to the promotion read
endpoints only. All traffic is consuming → producing (outbound from production;
no inbound to prod). Generalises to an **intermediary** (shared store / git)
locator under those transports.
*Avoid*: remote, link.

**Direction** (axis 1 — *who initiates the exchange*):

- **Source-initiated**: the producing instance starts the transfer.
- **Target-initiated**: the consuming instance starts the transfer (it reaches
out to fetch pending promotion requests). **← chosen for v1** (security: the
consuming instance holds a read-only token for the producing instance; the
producing instance can never reach into production).

**Transport** (axis 2 — *what the bytes travel over*):

- **Direct**: instance-to-instance HTTP API. **← chosen as the v1 wire.**
- **Git**: a git repository (Source Control). For v1, **backup/mirror only**
(audit copy of deployables / applied state), **not** the promotion wire.
Git-as-transport is deferred to the dedicated Source Control spike.
- **Shared store**: an intermediary like S3/R2 or a folder. Deferred.

A **deployable** is kept **transport-neutral** (a content-addressed package the
consuming side reads as a buffer), so direct / git / shared-store are adapters
over the same `plan` / `apply` — the transport choice never reaches the engine.

## Open decisions

- **Direct vs intermediary transport** — *not yet decided.* v1 builds the
  **direct** wire (producing instance *serves* deployables; consuming instance
  pairs with the producing instance). **Intermediary** (shared store / git: the
  deployable *lives between* the instances; the producing instance *publishes*
  to a neutral broker instead of serving; **both** ends are outbound to that
  broker, so there is no consuming → producing connection). The transport-neutral
  buffer and the request `locator` keep the seam open, but the **pairing
  topology** and **producing-side behaviour (serve vs publish)** genuinely
  differ — so this must be chosen deliberately, not fall out of the direct-only
  spike by default.

## Relationships

- A **Producing instance** creates a **Promotion request** targeting a
downstream environment.
- A **Promotion request** is exchanged via some **Direction** × **Transport**
combination — these two axes are independent.
- A **Consuming instance** plans, reviews, and applies a **Promotion request**
(this is the part the existing `ImportPipeline` already does).
- Discovery is **consuming-initiated pull** only: v1 is a **manual refresh**
(poll later). Push-notification needs a broker/relay and is incompatible with
pure target-initiated direction.
- Applying a promotion reuses `**workflow:import`** on the target project;
approve and apply are a single gated action in v1. Segregation of duties
(approver ≠ builder, or a `promotion:approve` scope) is a flagged follow-up.
- Outcome feedback to the producing instance is an **optional `consuming → producing` status callback**, off by default (keeps the key read-only). It is
the only status mechanism compatible with target-initiated direction; enabling
it widens the key to a bounded status-write.
- **State ownership is split**: the producing instance is the system of record
for the **promotion request** and its (possibly-stale) status; the consuming
instance owns the local **review/apply record**, keyed by the deployable's
content hash (the production audit trail). No shared database; they reconcile
only via the pull (read) and the optional status callback (write).
- Rollback and "already applied" detection build on the deployable content hash
but are **flagged follow-ups**, not v1.

## Flagged ambiguities

- **"push" / "pull"**: overloaded. Source Control uses them for *transport*
("push to git" / "pull from git"). The spike uses them for *initiator
direction*. Resolved: we split into two axes — **Direction**
(source-initiated / target-initiated) and **Transport** (direct / git /
shared store). Do not say "push/pull" without qualifying which axis.

## Flagged follow-ups (out of v1 spike scope)

- Git as a promotion **transport** (vs backup) and reconciliation with
`SourceControlImportService` — the dedicated Source Control spike.
- Background **polling** and broker-based push-notification.
- **Segregation of duties** / `promotion:approve` scope.
- **Rollback** and "already applied" idempotency via deployable hash.
- Project/folder **granularity** as a root-selection mode.
- Source-initiated direction for CI/push scenarios.

