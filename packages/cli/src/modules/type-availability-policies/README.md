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

This is a default module. The license feature `feat:typeAvailabilityPolicies` is the only gate.
Without it, `init()` never runs, so the controllers are not mounted and no check is registered.

**Do not disable the module on only some instance types.** Each process reads its own
configuration. An instance that disables it only on its queue workers enforces saves and
publishes on main, and enforces nothing at all on the workers — every execution there is
admitted.

The break-glass levers stay the ones the substrate documents: add this module to
`N8N_DISABLED_MODULES`, or disable `policy-infrastructure` to stop every policy feature.

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

A rule of this kind is written on `/credential-type-policies` and
`/projects/:projectId/credential-type-policies`, behind `credentialTypePolicy:manage` — its
own permission, because blocking `oAuth2Api` is a wider lever than blocking one node.

It implements all eight points:

| Point                    | What it reads                                         |
| ------------------------ | ----------------------------------------------------- |
| the five workflow points | the keys of every node's `credentials` map, the type HTTP Request names by parameter, and `extendsCredential` |
| `credentialSave`         | the type of the credential being written              |
| `credentialTransfer`     | the credential's type, against the **target** project |
| `credentialDecrypt`      | `credentialType` — the credential's own type          |

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

### Credential-only nodes

The VirusTotal, Sysdig and Zabbix nodes, and every other node the editor generates from a
credential type with `httpRequestNode`, are HTTP Request with one credential type attached. The
editor names them `n8n-creds-base.<credentialType>` and stores them as
`n8n-nodes-base.httpRequest` with `extendsCredential: '<credentialType>'`. No package registers
the generated name, so the backend never sees it.

Both kinds agree on such a node: it is available when `n8n-nodes-base.httpRequest` is available
under the node kind **and** its credential type is available under the credential kind. The node
check judges the stored `httpRequest` node; this check judges `extendsCredential` (and the
parameter and `credentials` sources, which name the same type once configured). The frontend
module composes the same two verdicts for the nodes panel, so a credential type rule on
`virusTotalApi` hides the VirusTotal node and leaves HTTP Request and Sysdig in place.

A node type rule on `n8n-creds-base.*` would match nothing, so the service refuses it at every
write and names the credential type rule to write instead. Blocking HTTP Request itself still
hides every credential-only node, as before.

### What the second kind costs

The snapshot holds both kinds, so the second kind costs no query at decision time. A snapshot
reload reads every scope of every kind in 4 queries, up to 10,000 scopes — pinned in
`node-type-policy.store-reads.test.ts`.

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
	"matchedRuleId": "rule-7",
	"projectId": "project-1",
	"optInAvailable": false
}
```

`matchedRuleId` is absent when the scope's default action decided and no rule matched. `scope`
names the scope whose verdict decided, which is what a user needs to know who to ask.

`projectId` names the project whose policy was evaluated, also for an instance denial. A
sub-workflow is checked against its own project, so its refusal names that project, not the
caller's. It is absent when no project applied. A project denial's message says "a project
policy" and never names the project: the client resolves the name, and only for a project the
user can see.

`optInAvailable` is `true` when the instance delegated the type, so the project can lift the
block with its own allow rule. It is always `false` when no project applied.

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
reports version `0`, so a first write sends `expectedVersion: 0`. One accepted write moves the
version by exactly one, whatever it changed.

Evaluation is `instance ∩ project`, and a project can only restrict further. `delegate` is the
one exception: an instance `delegate` is satisfied only by an explicit project `allow` rule,
never by a project's bare default. `policy-evaluator.ts` owns that law and is pure, so it is
the place to read it.

A `name` rule for a node also covers the `Tool` and `HitlTool` variants the registry generates
from it at startup: a rule for `n8n-nodes-base.gmail` denies `n8n-nodes-base.gmailTool` and
`n8n-nodes-base.gmailHitlTool` too. A real node whose name ends in `Tool` is not a variant of
anything, and only its own name matches it. When one rule names the base and another names the
variant, the first match in rule order decides, as it does when a `name` and a `package` rule
overlap; a variant rule placed after its base rule can never match, and the write-time shadow
lint warns about it. The verdict names the variant the user placed and the rule that decided.
Grandfathering compares literal type names, so adding `gmailTool` to a workflow that already
stores `gmail` is a new type and is judged.

A credential type policy has a third selector, `extends`. It matches the named type and every
type built on it through the credential's `extends` list, at any depth: `extends oAuth2Api`
covers `googleOAuth2Api` and `googleSheetsOAuth2Api`. A `name` rule stays exact, so
`name oAuth2Api` blocks only the generic OAuth2 credential. Rule order decides as usual: an
`allow name googleSheetsOAuth2Api` placed before `deny extends oAuth2Api` keeps Sheets usable,
and placed after it, the shadow lint warns that it can never match. A write rejects an `extends`
rule in a node type policy.

A rule can name a package or type that this instance has not loaded. The write saves it and
returns a `notLoaded` warning for it, next to the `shadowed` warnings. This applies to all
three selectors. Thus, when you uninstall a package, its rules do not block later writes to the
policy. An installed node that `NODES_EXCLUDE` or `NODES_INCLUDE` filters out is not loaded
either. The policy still enforces its rule, because evaluation matches type names, but a policy
cannot make a filtered-out node available. One exception: a write rejects a `package` rule on `n8n-creds-base`, because no package
can ever provide it.

### Reading it on the execution path

`workflowStart` runs for every execution and every sub-execution, under a 250 ms deadline it
fails closed on. Any I/O on that path can miss the deadline, even when the store is healthy: a
worker whose event loop stalls fires the deadline timer before it handles a reply that has
already arrived.

So each process holds every configured scope in memory, in
`TypeAvailabilityPolicySnapshot`. A decision reads that map and does no I/O. It resolves before
any timer can fire. A project with no scope row reads as allow-all, which is correct only
because the snapshot holds every row.

The database stays the source of truth. Three things keep the snapshot fresh:

- **The process that wrote reloads after its transaction commits.** The response waits for
  that reload, so the editor sees its own change at once.
- **The other processes reload on the `reload-type-availability-policies` pubsub command.** The
  writer publishes it after the commit. The subscriber debounces it for 300 ms, as it does every
  command not in `IMMEDIATE_COMMANDS`, so a burst of writes costs one reload. Outside queue mode
  there is one process and no command.
- **A poll catches a command that was lost.** Redis pubsub does not redeliver. Every 30 seconds,
  each process reads `COUNT(*)`, `SUM(version)` and `MAX(createdAt)` of the scope table. A delete
  lowers the count, an update bumps a version, and an insert sets the newest `createdAt`. So a
  different result means a missed change, and the process reloads.
  A process also reloads when its pubsub subscriber reconnects.

A reload reads every scope of every kind in 4 queries. Above 10,000 scopes or attached policies,
each further batch of 10,000 IDs adds one query. Reloads run one at a time, so an older reload can
never overwrite a newer one.

The module loads the snapshot in `init()`, before the process takes work. If that first load
fails, the process still boots: decisions read the database directly, under the same deadline,
and the poll retries the load.

The admin reads (`getEffectivePolicy`, behind the `GET` routes) read the database on purpose:
the `version` they report is what the editor sends back as `expectedVersion`, so a stale read
there would surface as a write conflict.

## The write seal

This is the first check that can deny anything, so the clearance token is now exercised end to
end. `enforceWorkflowSave` mints a `PolicyCleared`, the host threads it into the repository, and
`WorkflowRepository.updateContent` / `createContent` refuse a write without a clearance bound to
that point and subject. The integration suites assert the refused save leaves the stored row
untouched, which is the part a unit test cannot show.

No further hardening was taken up here. Every path that writes a workflow's nodes already goes
through a sealed repository method, and the lint rule that guards that has no allowlist left.

## Known limits

- **A workflow carried inside a node's parameters is not read.** The check reads
  `workflow.nodes`. Node types inside an inline sub-workflow definition are invisible to it.
  The credential lock still catches such a node once it asks for a credential.
- **A decryption with no consumer is not policed.** `consumer` is `null` wherever no node is
  asking — an OAuth authorize or revoke, the agents adapter, a log-streaming destination. There
  is no node type to evaluate there, and the credential's type is deliberately not a stand-in,
  so the decryption goes through.
- **A policy change reaches other processes after the pubsub command, or within 30
  seconds.** The command normally takes effect about 300 ms after the last write. If a process
  misses it, the fingerprint poll finds the change on its next run.
- **A row edited outside the service is picked up by the poll only.** A migration or manual
  SQL publishes no command. The poll sees the change if it moves a version, the row count or
  the newest `createdAt`.
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
| `credential-type-policy.check.ts`                 | Credential types: all eight points, including `credentialSave`                  |
| `policy-evaluator.ts`                             | Pure evaluation: first match per scope, then the instance ∩ project composition |
| `policy-shadow-lint.ts`                           | Warns at write time about rules an earlier rule already covers                  |
| `policy-rule-lint.ts`                             | Adds `notLoaded` warnings and merges all write-time warnings in rule order      |
| `package-resolver.ts`                             | Resolves a type's package per `kind`, for the `package` selector                |
| `type-availability-policy.service.ts`             | Reads and writes the store, with versioning and row locks                       |
| `type-availability-policy-snapshot.ts`            | Holds every scope in memory for decisions, and keeps it fresh                   |
| `effective-policy.ts`                             | The composed policy of one scope, and its allow-all default                     |
| `type-availability-policy-instance.controller.ts` | Instance scope, documents and attachments, `node-types`                         |
| `type-availability-policy-project.controller.ts`  | A project's own scope, for project admins, `node-types`                         |
| `credential-type-policy-instance.controller.ts`   | Instance scope, documents and attachments, `credential-types`                   |
| `credential-type-policy-project.controller.ts`    | A project's own scope, for project admins, `credential-types`                   |
| `available-types.controller.ts`                   | The effective type set for one project, for the builder                         |
| `database/`                                       | The scope, document and attachment entities and repositories                    |
