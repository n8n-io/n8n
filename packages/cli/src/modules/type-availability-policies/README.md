# Type availability policies

Rules that say which node types and which credential types a project may use. An admin writes
the rules. The policy infrastructure enforces them at the points that handle a workflow — save,
publish, start, transfer and import — and at the points that handle a credential.

Most of this document describes the node type check, which came first. "The credential type
check" below covers the second one and only the ways it differs.

This module is the first tenant of that infrastructure. It adds two checks and one store, and
nothing else: no enforcement path of its own, no error shape, no audit line. Read
`../policy-infrastructure/README.md` for the substrate, and the policy infrastructure RFC in
Notion for why the substrate looks the way it does.

## Turn it on

Two gates, both required:

1. The license feature `feat:typeAvailabilityPolicies`. Without it, `init()` never runs, so the
   controllers are not mounted and no check is registered.
2. `N8N_ENABLED_MODULES=type-availability-policies`. This module is not a default module yet.

**Set the environment variable on every instance type.** The module has no instance-type
restriction, but each process reads its own configuration. An instance that enables it only on
main enforces saves and publishes, and enforces nothing at all on its queue workers — every
execution there is admitted.

The break-glass levers stay the ones the substrate documents: remove this module from
`N8N_ENABLED_MODULES`, or disable `policy-infrastructure` to stop every policy feature.

## What each point decides

| Point               | Scope it reads                   | Verdict                                        |
| ------------------- | -------------------------------- | ---------------------------------------------- |
| `workflowSave`      | the workflow's project           | violations for node **types** the save adds    |
| `workflowPublish`   | the workflow's project           | every blocked type in the workflow             |
| `workflowStart`     | the workflow's project           | every blocked type in the workflow             |
| `workflowTransfer`  | the **target** project           | every blocked type in the workflow             |
| `contentImport`     | the project the content lands in | every blocked type in the workflow             |
| `credentialDecrypt` | the executing project            | the type of the node asking for the credential |

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

## The credential lock

`credentialDecrypt` is the one point that reads no workflow. A node asks for a credential, and
the verdict is about **the node asking**: a Slack credential is refused to a blocked Slack node
and handed to an allowed HTTP Request. The credential's own type is never evaluated. Deriving
availability from "some usable node accepts this type" is close to vacuous, because HTTP
Request accepts almost any credential, and it would let installing an unrelated node package
change which credentials work.

`workflowStart` already fails a run that carries a blocked type, so this point is there for the
decryptions no run covers:

- a parameter dropdown loading its options, which decrypts without starting an execution;
- a node the workflow points cannot see, such as one inside a workflow carried in another
  node's parameters.

A refusal fails the decryption with the same `node-type-unavailable` violation the workflow
points report, naming the **node type** as `subject`. The audit line carries the credential's
id and type from the context.

## The credential type check

`CredentialTypePolicyCheck` is the second check in this module. It reads the same store under
the `credential-types` kind, where a type name is bare (`slackApi`) rather than
package-qualified. The two checks stack: either veto blocks, so a rule on the Slack node and a
rule on `slackApi` are independent decisions.

It implements all seven points:

| Point               | What it reads                                      |
| ------------------- | -------------------------------------------------- |
| the five workflow points | the keys of every node's `credentials` map    |
| `credentialSave`    | the type of the credential being written           |
| `credentialDecrypt` | `credentialType` — the credential's own type       |

Two differences from the node check are the point of the whole thing:

- **`credentialDecrypt` ignores the asking node.** A blocked `slackApi` is refused to the Slack
  node and to an HTTP Request node alike, which is the hole a node rule alone leaves. A null
  `consumer` changes nothing either: an OAuth flow or a credential test has no node to police,
  but it does have a credential type.
- **`credentialSave` refuses creating a credential of a blocked type.** That is a build
  experience guard, not a boundary — decryption already makes such a credential inert. An edit
  that keeps the stored type is grandfathered, so a type blocked after the fact stays openable
  and renameable.

A violation is `credential-type-unavailable` with `subjectType: 'credentialType'`; everything
else about the shape matches the node check.

Workflow-point grandfathering works the same way, one level down: the save diff compares
credential **types**, so swapping which `slackApi` credential a node uses, or copying the node,
adds nothing to police.

### What the second kind costs

The cache is keyed per kind, so the two kinds share nothing. A cold decision on a project with
both scopes configured and attached costs 12 queries where one kind cost 6, and a warm one
costs none — pinned in `node-type-policy.store-reads.test.ts`. The decision service runs the
checks together, so the second kind costs queries rather than latency.

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

Every write drops the entries it changed, after its transaction commits. Invalidation is what
keeps the cache fresh; the 10-minute TTL is only a backstop — see "Cache staleness" under
"Known limits" for what is left for it to heal.

In front of that entry, each process shares its own read of a scope. It holds the promise
rather than the value, and registers it before the read starts, which buys two things on two
different time scales:

- **Callers that arrive while the read is running share it.** A burst of decisions on a cold
  entry costs one database read rather than one for each. Nothing survives from before here —
  the first caller registers its promise before any I/O, so the rest find it. The window is
  that one read.
- **Callers that arrive after it finished share it too, until 1 second after it began.** The
  window runs from the start of the read, not from its result, so a slow read leaves less of
  it. A warm decision then costs no round trip and no parse of every rule. That parse is what
  makes a decision on Redis grow more expensive as an admin writes more rules.

The 1 second must stay longer than one read, or the first of those leaks: a caller arriving
late in a slow read would find the entry expired and start a second read.

A cache call is also bounded at 50 ms and falls through to the database. ioredis queues
commands while it is disconnected rather than rejecting them, so without the bound a lost Redis
would hang the read and spend the whole 250 ms budget instead of failing over.

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
  The credential lock still catches such a node once it asks for a credential.
- **A decryption with no consumer is not policed.** `consumer` is `null` wherever no node is
  asking — an OAuth authorize or revoke, the agents adapter, a log-streaming destination. There
  is no node type to evaluate there, and the credential's type is deliberately not a stand-in,
  so the decryption goes through.
- **A policy change applies at once, plus up to 1 second.** The write drops the shared entry,
  which reaches every process, because every deployment with more than one process reading
  policy shares one Redis cache — unless `N8N_CACHE_BACKEND=memory` is set by hand in queue
  mode. What is left is each process's 1-second shared read, so that is the staleness window a
  builder or an execution can see.

  A read that hit the database before the write committed can put its old snapshot back after
  the delete. Two rules stop it. On the process that wrote, a counter of invalidations makes
  that read skip its write-back. And any read that took longer than a second skips it as well,
  whichever process it ran on — because the invalidated keys are also dropped a second time one
  second later, so a read that finished inside that second cannot outlive both deletes. A read
  that skips the write-back still answers its own caller; only the rest of the cluster waits
  for the next read.

  `CacheService` has no compare-and-set, so a slow read pays for this by not populating the
  cache at all. Pubsub invalidation would remove the need, and is the step that would also let
  that 1 second grow and the TTL go away.

- **The 10-minute TTL heals only what invalidation cannot reach.** Three cases, all
  operator-level: that forced memory backend, where each process keeps its own copy and no
  delete reaches it; a `deleteMany` that failed after its write committed, which is logged and
  not retried; and a row edited outside the service, by a migration or manual SQL.
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
| `node-type-policy.check.ts`                       | Node types: the six points, the save diff, the violations                       |
| `credential-type-policy.check.ts`                 | Credential types: all seven points, including `credentialSave`                  |
| `policy-evaluator.ts`                             | Pure evaluation: first match per scope, then the instance ∩ project composition |
| `policy-shadow-lint.ts`                           | Warns at write time about rules an earlier rule already covers                  |
| `package-resolver.ts`                             | Resolves a type's package per `kind`, for the `package` selector                |
| `type-availability-policy.service.ts`             | Reads and writes the store, with versioning and row locks                       |
| `type-availability-policy-instance.controller.ts` | Instance scope, documents and attachments, `node-types`                         |
| `type-availability-policy-project.controller.ts`  | A project's own scope, for project admins, `node-types`                         |
| `credential-type-policy-instance.controller.ts`   | Instance scope, documents and attachments, `credential-types`                   |
| `credential-type-policy-project.controller.ts`    | A project's own scope, for project admins, `credential-types`                   |
| `available-types.controller.ts`                   | The effective type set for one project, for the builder                         |
| `database/`                                       | The scope, document and attachment entities and repositories                    |
