# Node type availability policies

Rules that say which node types a project may use. An admin writes the rules. The policy
infrastructure enforces them at the points that handle a workflow: save, publish, start,
transfer and import.

This module is the first tenant of that infrastructure. It adds a check and a store, and
nothing else: no enforcement path of its own, no error shape, no audit line. Read
`../policy-infrastructure/README.md` for the substrate, and the policy infrastructure RFC in
Notion for why the substrate looks the way it does.

## Turn it on

Two gates, both required:

1. The license feature `feat:nodeTypePolicies`. Without it, `init()` never runs, so the
   controllers are not mounted and no check is registered.
2. `N8N_ENABLED_MODULES=type-availability-policies`. This module is not a default module yet.

**Set the environment variable on every instance type.** The module has no instance-type
restriction, but each process reads its own configuration. An instance that enables it only on
main enforces saves and publishes, and enforces nothing at all on its queue workers — every
execution there is admitted.

The break-glass levers stay the ones the substrate documents: remove this module from
`N8N_ENABLED_MODULES`, or disable `policy-infrastructure` to stop every policy feature.

## What each point decides

| Point              | Scope it reads                   | Verdict                                     |
| ------------------ | -------------------------------- | ------------------------------------------- |
| `workflowSave`     | the workflow's project           | violations for node **types** the save adds |
| `workflowPublish`  | the workflow's project           | every blocked type in the workflow          |
| `workflowStart`    | the workflow's project           | every blocked type in the workflow          |
| `workflowTransfer` | the **target** project           | every blocked type in the workflow          |
| `contentImport`    | the project the content lands in | every blocked type in the workflow          |

The check reads the license again per decision. A license that lapses while the instance runs
stops enforcement, which matches the routes that author the policy: an admin who can no longer
edit the policy must not stay blocked by it.

A context with no project is evaluated against the instance scope alone. An instance `deny`
still denies there. An instance `delegate` denies too, because delegation needs a project to
opt in and there is no project.

## Grandfathering

`workflowSave` is the only point that tolerates anything. It compares the submitted workflow
with the stored one and reports only the node **types** that the save adds. So a new rule never
makes existing content uneditable.

The diff is type-level, not node-level, on purpose. A node that is moved, renamed, duplicated or
pasted keeps a type the stored workflow already has, so it reports nothing. Adding a second node
of an already-stored blocked type also reports nothing — the workflow cannot publish or run while
that type is blocked, so the extra node changes nothing that matters.

Publish and start apply no grandfathering. This pair is deliberate, and it reads as a bug if
nobody explains it:

> An old workflow with a blocked type still saves. It refuses to publish, and a run of it fails
> as an execution with the violations on the error.

A transfer applies no grandfathering either. Grandfathering protects content where it lives. It
does not travel into a project whose rules the content has never met.

A node counts even when it is disabled. Exempting disabled nodes would open a two-step path
around the save diff: add the node disabled, then enable it once its type is stored.

## What a violation looks like

One violation per blocked type, deduplicated, in the order the types first appear:

```json
{
	"kind": "node-type-unavailable",
	"checkId": "node-type-availability",
	"message": "Node type \"n8n-nodes-base.slack\" is blocked by an instance policy",
	"subject": "n8n-nodes-base.slack",
	"subjectType": "nodeType",
	"scope": "instance",
	"matchedRuleId": "rule-7"
}
```

`matchedRuleId` is absent when the scope's default action decided and no rule matched. `scope`
names the scope whose verdict decided, which is what a user needs to know who to ask.

The violations reach the caller as HTTP 403 with `meta.violations`, and a blocked run stores
them on the execution's error. Today that error is the whole story a user gets: the builder
does not yet read `GET /projects/:projectId/available-types`, so a denied node looks normal
until the save is refused. That endpoint exists for the builder to gray the node out up front,
and wiring it is a separate piece of work.

## The store

A policy lives in three tables:

- a **scope** row per `(kind, projectId)`, holding the `defaultAction` and a `version`,
- **policy documents**, each a list of rules,
- **attachments**, which bind a document to a scope with a priority and a floor flag.

`projectId: null` is the instance scope. An unwritten scope has no row: it allows everything and
reports version `0`, so a first write sends `expectedVersion: 0`.

Evaluation is `instance ∩ project`, and a project can only restrict further. `delegate` is the
one exception: an instance `delegate` is satisfied only by an explicit project `allow` rule,
never by a project's bare default. `policy-evaluator.ts` owns that law and is pure, so it is
the place to read it.

### Reading it on the execution path

`workflowStart` runs for every execution and every sub-execution, under a 250 ms deadline it
fails closed on — so a slow database fails runs rather than slowing them. Evaluation therefore
reads each scope through a `CacheService` entry keyed
`type-availability-policy:scope:{kind}:{projectId ?? 'instance'}`, and a warm decision costs no
queries at all. The instance entry is one row shared by every project.

Every write drops the entries it changed, after its transaction commits. The 5-minute TTL is a
backstop for the two cases a delete cannot reach, both under "Known limits".

The admin reads (`getEffectivePolicy`, behind the `GET` routes) stay uncached on purpose: the
`version` they report is what the editor sends back as `expectedVersion`, so a stale read there
would surface as a write conflict.

## The write seal

This is the first check that can deny anything, so the clearance token is now exercised end to
end. `enforceWorkflowSave` mints a `PolicyCleared`, the host threads it into the repository, and
`WorkflowRepository.updateContent` / `createContent` refuse a write without a clearance bound to
that point and subject. The integration suites assert the refused save leaves the stored row
untouched, which is the part a unit test cannot show.

No further hardening was taken up here. Every path that writes a workflow's nodes already goes
through a sealed repository method, and the lint rule that guards that has no allowlist left.

## Known limits

- **Sibling tool types are separate names.** A rule that denies `n8n-nodes-base.gmail` does not
  deny `n8n-nodes-base.gmailTool`. The registry holds them as two types.
- **A workflow carried inside a node's parameters is not read.** The check reads
  `workflow.nodes`. Node types inside an inline sub-workflow definition are invisible to it.
- **A forced memory cache goes stale.** A write drops the cached scope it changed, which is
  enough wherever the processes share one Redis cache — which is every deployment that has
  more than one, unless `N8N_CACHE_BACKEND=memory` is set by hand in queue mode. There each
  process keeps its own copy and no delete reaches it, so a policy change takes up to the
  5-minute TTL to land. The same TTL is what bounds a row edited outside the service.
- **Type-level policy is not a data boundary.** Blocking a node does not block the API behind
  it, because HTTP Request and Code remain available. Load-time exclusion
  (`NODES_EXCLUDE`) is the stronger tool for the types that must never load.
- **An import is judged on its whole content.** The import context carries no stored workflow,
  so there is nothing to grandfather against: a source-control pull of a workflow that already
  carried a now-blocked type is refused on every pull.

  Each host picks what a refusal costs, and those postures are the substrate's, not this
  feature's. A pull **skips that one workflow and carries on**, reporting it on the pull result
  as `contentImportPolicy.violations`; the rest of the pull lands. A package import refuses the
  whole package. The pull is deliberately partial: one denied workflow must not block every
  other workflow's deploy, and the skipped one keeps its previous state rather than being
  half-written. The cost is that git and the instance diverge for that workflow until an admin
  allows the type or the workflow drops it — which is why the divergence is reported rather
  than only logged.

## Files

| File                                              | Role                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `node-type-policy.check.ts`                       | The `@PolicyCheck()` class: the five points, the save diff, the violations      |
| `policy-evaluator.ts`                             | Pure evaluation: first match per scope, then the instance ∩ project composition |
| `policy-shadow-lint.ts`                           | Warns at write time about rules an earlier rule already covers                  |
| `type-availability-policy.service.ts`             | Reads and writes the store, with versioning and row locks                       |
| `type-availability-policy-instance.controller.ts` | Instance scope, documents and attachments                                       |
| `type-availability-policy-project.controller.ts`  | A project's own scope, for project admins                                       |
| `available-types.controller.ts`                   | The effective type set for one project, for the builder                         |
| `database/`                                       | The scope, document and attachment entities and repositories                    |
