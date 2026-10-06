# Promotions

Moves n8n packages between instances through a Git repository, and gates that
move with a review. This file fixes the language of the context. Decisions that
are hard to reverse live in `docs/adr/`.

## Language

### Connection model

**Provider**:
Stored credentials for one Git host, with a type (`git`, `gitlab`) and an auth
type (`ssh-key`, `token`).
_Avoid_: connector, integration

**Connection**:
One repository on a Provider, with a scope (`instance` or `projects`) and up to
one Config per Direction.
_Avoid_: repo link, remote

**Config**:
The settings for one Direction on a Connection. Promote carries the Base Branch
and the Branch required flag. Apply carries the branch it imports from.
_Avoid_: apply config, promote config (use "Config with direction apply")

**Direction**:
`promote` (instance to repository) or `apply` (repository to instance).

**Base Branch**:
The branch a Promote targets. With Branch required on, Promote pushes next to it
and opens a Merge Request against it. With Branch required off, Promote pushes to it.
_Avoid_: main, target branch (GitLab's word for the same thing in an MR)

**Branch required**:
The `createBranchOnPromotion` flag on a promote Config. On: each Promote pushes
to a new Promotion Branch. Off: each Promote pushes to the Base Branch.

**Promotion Branch**:
A branch named `n8n-promotion/<timestamp>` that holds one Promote.
_Avoid_: feature branch, review branch

### Runs and reviews

**Promotion Run**:
One execution of Promote that pushed a package to the repository.
It exists whether or not anyone reviews it.
_Avoid_: promotion, promote (the verb), promotion request

**Promotion Review**:
The gate on a Promotion Run. In the POC it is the Merge Request, read from
GitLab. A native n8n review would attach to the same Promotion Run.
_Avoid_: promotion run review, MR review, promotion request

**Merge Request (MR)**:
GitLab's review object for a Promotion Branch against the Base Branch.
n8n reads it; GitLab owns it.
_Avoid_: pull request, PR

**Promotion Review state**:
`open` (MR `opened` or `locked`), `merged`, `closed` (closed without merge),
or `unavailable` (the MR or its Connection is gone). GitLab is authoritative
while `open`; n8n stores the state and is authoritative once terminal. Never
mapped onto the Workflow Review `decision` values.
_Avoid_: approved, changes requested, pending (Workflow Review words)

**Review Baseline**:
The commit a Promotion Review diffs against: the merge base of the Promotion
Branch head and the current Base Branch, computed by n8n at read time.
_Avoid_: base sha (GitLab's `diff_refs.base_sha`, which can be stale), main

**Source Instance**:
The instance that runs Promote and hosts the Promotion Review. It always has a
promote Config and its checkout.
_Avoid_: upstream, dev instance

**Workflow Review**:
The existing per-workflow publishing gate inside one instance
(`workflow_review_request`). Not a Promotion Review.

**Review Inbox**:
The n8n view that lists reviews a user can act on. Today it lists Workflow
Reviews. The POC adds Promotion Reviews next to them.

## Relationships

- A **Provider** has many **Connections**
- A **Connection** has at most one **Config** per **Direction**
- A **Promotion Run** belongs to one **Connection**
- A **Promotion Run** has at most one **Promotion Review**
- A **Promotion Review** reads at most one **Merge Request** (POC: exactly one)
- A **Merge Request** compares one **Promotion Branch** with one **Base Branch**
- A **Workflow Review** and a **Promotion Review** never share a record

## Example dialogue

> **Dev:** "A user promotes with Branch required off. Do we get a **Promotion Run**?"
> **Domain expert:** "Yes. The push happened. There is no **Promotion Review**, because nothing gates it."
>
> **Dev:** "And with Branch required on?"
> **Domain expert:** "One **Promotion Run**, one **Promotion Branch**, one **Merge Request**. The MR is the **Promotion Review** for now."
>
> **Dev:** "Can I approve a **Promotion Review** like a **Workflow Review**?"
> **Domain expert:** "Only an instance admin can, and approving it merges the **Merge Request**. A **Workflow Review** approval publishes one workflow version. Different objects, same inbox."

## Flagged ambiguities

- "promotion review" and "promotion run" were used for the same thing.
  Resolved: the **Promotion Run** is the event, the **Promotion Review** is the
  gate on it. The POC entity is `promotion_review`: n8n keeps a row for the
  gate, not for the event.
- "target branch" means the **Base Branch** in n8n and GitLab's `target_branch`
  in an MR. Use **Base Branch** in n8n code and copy.
- The POC only writes a `promotion_review` row when it opens an MR. A direct
  push has no review and no row.
