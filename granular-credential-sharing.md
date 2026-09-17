# Spike: More granular sharing/control of credentials inside projects

**Status:** Investigation complete — recommendation in §10
**Date:** 2026-09-09
**Scope:** the credential access-control model on `master`

---

## 1. Question and answer

Can a credential-level "just me" restriction — letting an owner keep a credential usable
only by themselves while it stays visible inside one or more projects — give enterprise
customers the control they are asking for, particularly on triggers where no human
identity naturally exists?

**Yes, and the platform is well-positioned for it.** The permission logic already
supports restriction, and the two subsystems that would otherwise dominate the cost —
execution-data redaction and publish-time credential validation — already exist and can
be extended rather than built.

One prerequisite blocks it, and the same prerequisite already blocks end-user
credentials: **triggered executions carry no identity.**

Three findings drive everything below.

1. **Identity, not access control, is the blocker.** Activated workflows execute with no
   user attached. Any policy scoped to a subject has nothing to evaluate against on
   schedule, polling and webhook runs.
2. **Static credential sharing is coarse, and its enforcement has real defects.** There
   is no distinction between knowing a credential exists and being able to use it, and
   the execution-time gate ignores both the acting user and the credential role.
3. **The fix is to know who published the workflow, and it is worth building on its own.**
   "Just me" acts as the person who published, so a triggered run has to know who that
   was. n8n already records this at publish time but never reads it back. The same record
   would also help end-user credentials: today they cannot be published on triggers that
   do not say who is running the workflow, such as schedules, and a publishing identity
   would give those triggers one.

---

## 2. The conceptual move: splitting knowledge from capability

The proposal rests on separating two rights that credential sharing currently treats as
one:

- **Knowledge** — the subject knows this credential exists, its name and type, and can
  see which workflows reference it.
- **Capability** — the subject can cause the credential to be used against the third
  party it authenticates to.

Today a single grant conveys both, and this conflation produces both problems named in
the ticket. Adding a credential to a project silently confers capability on everyone in
it, and accidental impersonation follows directly: knowing about the "CEO's Gmail"
credential is indistinguishable from being licensed to send mail as the CEO.

Knowledge here does **not** include the secret. Decrypting credential data is already a
separate, stronger right, gated behind the edit permission rather than the read
permission. The model already contains one split of this kind; the proposal generalises
it.

The result is three states rather than two. The table's purpose is to show what differs
**for project members** — people whose access to the credential comes only from belonging
to a project — because they are the only ones the new state changes anything for.
Instance owners and administrators are unaffected by it, and are covered right after the
table.

| State | Who knows | Who can use |
|---|---|---|
| Private, unshared | owner | owner |
| **Visible, restricted** *(new)* | project members | owner |
| Shared | project members | project members |

**Instance owners and administrators are deliberately left out of this table.** They hold
credential rights instance-wide, and instance-wide rights are not filtered by any
project-level construct (§3.1): the sharing lookup skips its filter entirely for them, and
they also hold the edit right, which carries decryption. So an administrator can list,
decrypt and use every credential on the instance — in all three states above, including a
private, never-shared one.

This is existing break-glass behaviour, not something the proposal introduces or changes.
Whether "just me" should carve an exception into it is **D1**; the recommendation there is
to leave use alone and instead borrow the end-user-credential precedent for execution
*data*, where ownership overrides even an administrator's reveal right.

The middle state is the feature, and its defining property is that **visibility is
deliberately retained**. That is what distinguishes it from simply keeping the credential
in a personal space — which is why "just keep it private" is not an answer. Retained
visibility is load-bearing for three reasons:

1. **Auditability** — the requirement that motivated the request. An administrator must
   be able to see that a sensitive credential lives in a project and which workflows
   depend on it. A credential hidden from the project sits outside the audit surface.
2. **Maintainability** — the workflow lives in the project. If its credential is
   invisible, a colleague opening that workflow sees a node configured with something
   unnameable: they cannot diagnose failures and have nobody obvious to ask.
3. **Cover during absence** — teammates should be able to understand and repair a
   workflow whose owner is away, even when they cannot run it.

### 2.1 Relationship to end-user credentials

End-user credentials exist today as a substantial subsystem with pluggable identity
resolvers — an n8n-user resolver, an OAuth resolver, and a Slack resolver. Both features
separate "who may act" from "who may edit", but they answer different questions and suit
different triggers:

|  | End-user credentials | "Just me" |
|---|---|---|
| Whose account is used | **each** executing user's own | the owner's, always |
| Requires per-user connection | yes | no |
| Identity source | resolved from execution context | fixed at publish |
| Identity-bearing triggers | its purpose | works, but ignores the identity |
| Schedule / polling | **publish is refused** | **the gap this fills** |

End-user credentials answer *"act as whoever is running this"*; "just me" answers *"act
as me, and only me, no matter who runs it."* A schedule has nobody to be, so only the
second question is answerable there.

The two therefore **overlap rather than divide**. Wherever a trigger supplies an identity
both features work, and the choice between them is a product question, not a technical
one. Wherever it does not, only "just me" is available. End-user credentials cover a
strict subset of the triggers "just me" covers.

This is not a theoretical boundary. Publish-time validation classifies every trigger in a
workflow by whether it can supply an identity, and refuses to publish end-user
credentials unless **all** triggers qualify — with an error stating they are *"only
supported in workflows triggered manually, via chat, or as a sub-workflow."*

Note that the boundary follows **configuration, not node type**. A webhook supplies no
identity by default but does when set to n8n OAuth2 auth; a chat trigger qualifies only
in hosted mode; a form trigger only with user auth; and any trigger declaring a context
establishment hook supplies an external identity. So "identity-less trigger" is a
property of a configured node, not a fixed list — schedule and polling are simply the
cases that can never qualify.

---

## 3. The current model, stated abstractly

Access is computed over a graph with three node kinds — subjects (users), projects,
resources (credentials) — and two edge kinds:

- **membership**: subject → project, carrying a *project role*
- **grant**: project → credential, carrying a *credential role*

The critical structural fact: **there is no direct subject → credential edge.** Every
path from a person to a credential passes through a project. "Sharing with a person"
means granting to that person's personal project, which is a project like any other.

### 3.1 How permissions compose

For each path (subject → project → credential), the effective permission is the
**intersection** of the project role's permissions and the credential role's
permissions. The subject's total permission is the **union** over all such paths, plus
any instance-wide permissions held.

Two properties follow, and both matter.

**The credential role can only restrict, never grant.** Acting as an intersection mask,
no credential role can confer a permission the project role lacks. This is a strong
safety property: adding more restrictive credential roles carries no
privilege-escalation risk *by construction*. It is exactly the primitive the feature
needs, and it already exists — merely underused, since only two credential roles are
defined and they differ very little.

The mask is well understood by the team maintaining it. The owner role carries the
end-user-credential management right with an explicit comment noting that *without it,
the sharing mask would strip that right from a project admin's effective scopes* — a
direct statement of the intersection semantics.

**Instance-wide permissions escape the mask.** The intersection applies only to
project-derived and resource-derived permissions; those held globally pass through
unfiltered. No project-level construct can therefore restrict an instance administrator.

Current credential roles:

| Role | Rights |
|---|---|
| Owner | read, update, delete, share, unshare, move, connect, manage end-user |
| User | read, connect |

Note what is absent. The full credential right vocabulary is create, read, update,
delete, list, share, unshare, shareGlobally, move, connect, createEndUser and
manageInstance. **There is no right meaning "may be used in an executing node."** The
`connect` right is unrelated — it means attaching *your own account* to an end-user
credential. Usability is therefore inferred from the read right, which is precisely the
conflation §2 identifies.

### 3.2 Why "just me" needs two grants rather than one

**A grant has no place to name a person.** Every grant says three things: *which
credential*, *to which project*, *at which level*. There is no fourth slot for a subject.
A level therefore always applies to a whole project — to everyone in it, equally.

So the sentence *"inside the Marketing project, only Alice may use this"* cannot be
written as one grant. There is nowhere to put "Alice".

**But every person already has a project containing exactly themselves.** Personal
projects are ordinary projects; they are simply projects of one. That is enough to
express the restriction using two perfectly ordinary grants:

| Credential | To | Level |
|---|---|---|
| Gmail | Marketing project | can view |
| Gmail | Alice's personal project | can use |

**A person's access is the best of all routes they have.** Alice reaches the credential
two ways — through Marketing (view) and through her own personal project (use) — so she
gets *use*. Bob reaches it one way, through Marketing, so he gets *view*. That is exactly
the desired outcome, and it required no new mechanism: both grants are ordinary, and
"best of all routes" is how permissions are already computed.

An analogy: passes are issued to *departments*, never to individuals. You cannot issue
Marketing a pass valid only for Alice — a department pass covers the whole department.
But Alice also belongs to a one-person department of her own. So Marketing gets a
lobby-only pass, Alice's own department gets a full pass, and at the door she presents
whichever opens more.

**Why not just add a "person" column to grants?** It would work, but it introduces a
second way for permissions to flow: today access is always computed along
subject → project → credential, and this would add a direct subject → credential route
that every access query and the permission calculation would have to account for. It also
gains nothing, because a personal project *is already* the one-person container such a
column would create.

That is why the two-grant shape is **forced by the data model rather than chosen** — it
is the only form the restriction can currently take.

### 3.3 What this means at creation time

The restriction is offered wherever a credential is created, but the two cases are not
symmetric.

**Created in a personal project.** Ownership is already in the right place, so the
restriction only governs whether a second, view-level grant is added to a team project.
Off means private, as today; on means visible to the team but usable only by the owner.
Nothing moves.

**Created in a team project.** Ownership must *relocate* to the creator's personal
project, because an owner grant held by a team project necessarily confers owner-level
rights on that project's members, and it cannot be narrowed to one of them — there is no
subject slot to narrow it to (§3.2). "Just me" inside a team project therefore always
means: owner grant in the creator's personal project, view grant to the team.

This is forced, not chosen, and it produces a genuine product fork (**D8**): the
credential is now *owned* by an individual while *appearing* in a team project, and
the interface must decide which of those two facts it presents as the credential's
home.

It also affects offboarding — when the owner leaves, their personal project goes with
them, leaving the credential visible to the team but usable by nobody — and anything
that resolves "which project owns this credential" (**D5**).

**Switching the restriction off is cheap; switching it on is not.** Lifting it only
upgrades the team grant from view to use — ownership stays where it already is. It is
switching it *on* for a credential a team already owns that forces the relocation, and
that is also the case with no recorded creator to relocate ownership to (**D9**). A first
version can therefore offer the restriction at creation time only while allowing it to be
lifted at any time, and never move an existing grant at all.

### 3.4 Possible later: sharing with a few named people

The same shape scales to *"just me, you and James"* with no new mechanism. The allow-list
is simply a set of personal-project grants — one per person — sitting alongside the
view-level grant to the team project. "Just me" is the same thing with a list of one.
Building it is UI work plus bulk grant operations: no new tables, and no change to how
permissions are calculated.

Two limits are worth knowing before relying on it. Grants live on each person's own
personal project, so they survive that person leaving the team project — removing someone
from a project should also clean up their credential grants. And because permissions only
ever add up, there is no way to say "everyone except James": exclusions have to be written
out as an explicit list, which drifts as people join. The model suits short allow-lists,
not "the whole team minus one".

One thing it cannot express at all is *"James may use this, but only inside Marketing"*. A
grant has one slot on the subject side, and using it to name a person leaves nowhere to
name a context. That would need a direct person-to-credential link — onto which existing
grants could be migrated mechanically, since a personal project maps to exactly one user.

---

## 4. The identity problem

A subject-scoped policy requires a subject. Manual execution has one. **Triggered
execution does not** — schedule, polling and webhook runs are initiated by the system,
and no user identity is attached anywhere along the execution path.

This is the pivot of the spike:

> A "just me" restriction cannot be enforced on triggered workflows without first
> designating an identity for those executions.

The platform has already conceded the point from the other direction. Rather than
inventing an identity for identity-less triggers, publish-time validation classifies them
and refuses the combination outright (§2.1).

Fortunately the harder half is done: the system already records which user performed
every activation and deactivation. What is missing is purely a read path — nothing
consults that record when an execution begins.

The resulting semantics are intuitive. A workflow published by Alice runs as Alice, and
keeps running as Alice while she is away. A colleague who cannot use her credential also
cannot re-publish the workflow — otherwise re-publishing under their own identity would
trivially bypass the policy. Publishing is already a distinct, separately enforced
permission, so this hinge exists.

Open edge cases (**D4**): the publisher may be deleted, and workflows may arrive via
source control with no meaningful publisher.

---

## 5. Enforcement audit

Each gate was examined for two questions: does it consider *who* is acting, and does it
consider the *credential role* on the grant?

| Gate | Subject-aware | Role-aware | Assessment |
|---|---|---|---|
| List / view credentials | yes | yes | correct |
| Decrypt for editing | yes | yes | correct |
| Create / update workflow | yes | partial | sound shape, wrong right |
| **Execute — stored workflows** | **no** | **no** | **broken** |
| Execute — inline sub-workflow | yes | partial | correct, but a different model |
| Runtime credential load | no | no | by design; sole point of failure |
| Publish / activate | yes | no | permission exists; no credential gate |
| Read execution data | yes | n/a | exists, but keyed on policy, not sharing |
| Share / unshare | yes | hard-coded | blocks new roles |

Five points deserve emphasis.

**1. The execution gate never asks who is running the workflow.** Before a stored
workflow runs, the check asks a single question: *is this credential shared with any
project this workflow belongs to?* It does not ask who started the run, and it does not
look at the sharing level. Any share of any kind is enough.

So the difference between the two credential roles that exist today has no effect at
execution time — whatever level a grant carries, the workflow runs. This is the "flaky
enforcement" suspected on the call, and it is a defect today, independent of this
feature. Making this check subject-aware is the core of the work.

**2. The check the feature needs already exists — on one path only.** A second, better
check is already written and tested. It covers sub-workflows whose definition lives
inside a node parameter rather than the database: having no project of their own, their
credentials are checked against the person who triggered the run.

That is exactly the shape "just me" requires. The two checks currently sit in
neighbouring branches of one function and answer different questions. The work is to
extend the subject-aware one to stored workflows, not to invent it.

**3. Save-time protection already behaves correctly.** Save a workflow containing a
credential you cannot access, and the nodes bound to it are restored to their previous
state; a newly added node referencing such a credential is rejected outright. Renaming,
moving and disabling still work.

This is precisely the "edit yes, credential no" behaviour **D3** asks for. It needs
pointing at the new capability right instead of the read right — nothing more.

**4. Publishing is unchecked, and that is the main bypass.** Publishing is its own
permission, and publish-time validation does inspect credentials — but only end-user
ones. For ordinary credentials there is no check at all.

A colleague who cannot run the workflow manually could therefore publish it and let the
schedule run it on their behalf, defeating the whole restriction. Closing this is
mandatory.

**5. Sharing cannot revoke what it does not recognise.** The share operation identifies
current recipients by matching one specific role name, and always writes that same name.
A grant carrying any other role is invisible to it: never listed, never removed.

Introduce a new role without fixing this and "unshare" will silently fail to revoke — an
access leak. This must be fixed before any new role is added.

---

## 6. Existing infrastructure this can reuse

Three subsystems already exist that a naive estimate would assume need building.

**Execution redaction.** A full subsystem with a two-level policy model: a per-workflow
policy (none / manual-only / non-manual / all) and an instance-wide floor that individual
workflows may exceed but not undercut. Redaction is permission-gated — revealing data
requires a dedicated reveal permission — and reveal attempts are audited. The coarse
strategy clears **all** items across **all** nodes, including inputs and errors, which
sidesteps the transitive-flow problem in §8 by not attempting partial redaction at all.

**A precedent for identity-scoped reveal.** Executions that used dynamically resolved
credentials are revealable *only* by the user they ran as, and the general reveal
permission deliberately does not override this. This is already the exact shape "just me"
needs: a hard, ownership-based rule that instance-wide permissions cannot bypass. The
pattern is implemented and tested; it needs a second trigger condition.

**Publish-time credential validation.** Publishing already collects the workflow's
credentials, classifies its triggers by the identity they can supply, and refuses invalid
combinations with actionable errors. A "just me" publish gate is an additional rule in an
existing framework, not new machinery.

---

## 7. Proposed model

### 7.1 A capability right

Introduce an explicit right meaning *may be bound to a node that executes*, distinct from
the read right. After the split:

- **read** — the credential exists, has this name and type, and is referenced here
- **use** — it may be bound to a node that executes
- **update** — the secret may be decrypted and changed (unchanged)

⚠️ **Naming caution.** The existing `connect` right means something different — attaching
*your own account* to an end-user credential. The new right must not be named in a way
that invites confusion; the two coexist and are not substitutes.

Because roles are declared statically and reconciled into storage at startup, adding a
right and new roles requires no data migration.

### 7.2 A role ladder

| Credential role | read | use | update | Purpose |
|---|---|---|---|---|
| Owner | ✔ | ✔ | ✔ | unchanged |
| User | ✔ | ✔ | — | unchanged in effect |
| **Viewer** *(new)* | ✔ | — | — | the "just me" restriction |
| **Editor** *(new, optional)* | ✔ | ✔ | ✔ | fills the read+write rung |

Backward compatibility falls out of the intersection property: granting *use* to the
existing User role leaves every current grant behaving exactly as it does now. Existing
installations see no change until someone opts into Viewer.

### 7.3 Sharing semantics

Sharing changes from a membership list to a per-recipient level choice: for each project,
the owner picks *can view*, *can use*, or *can edit*. Sharing with an individual continues
to work via their personal project and composes unchanged.

The hard-coded role in the share operation (§5) **must be generalised before any new role
is introduced**, or revoking access will silently fail to revoke. Revocation is already a
separately named permission, which makes this a natural place to fix it.

### 7.4 What follows for the user experience

A colleague without the *use* right can: see the credential listed in the project, see
which workflows reference it, open those workflows, edit their logic, and save. They
cannot: run them manually, publish them, bind that credential to a new node, or decrypt
the secret. Nodes bound to unusable credentials render read-only — a presentation the
interface already supports.

---

## 8. Execution data

Two facts make partial redaction unsafe.

Permissions are checked when someone *looks* at data. Execution data was written earlier,
under whatever permissions applied then.

And data moves downstream: a Gmail node's output is the next node's input. Hide only the
Gmail node and the same data is still visible one step later. Partial redaction is
therefore not a weaker guarantee but a false one — worse than none, because people will
trust it.

The existing subsystem avoids this by clearing everything rather than part of it. That is
the right call, and it is already made.

**Recommendation:** add one trigger to it — *the viewer lacks the use right on a credential
this run touched*. Copy the rule already used for end-user credentials, including the part
where instance-wide reveal does not override it. Leave per-node redaction alone unless
someone asks for it.

---

## 9. Open decisions

| # | Question | Why it's hard | Answer |
|---|---|---|---|
| **D1** | Do admins bypass "just me"? | Global rights skip the mask by design; blocking them weakens break-glass. | **Admins keep use.** But for *data*, copy the end-user rule: ownership beats even admin reveal, and log the attempt. |
| **D2** | Do old executions get re-hidden when sharing changes? | Retroactive redaction means reprocessing stored data. | **No.** Redaction already runs at read time, so current permissions apply. Document it. |
| **D3** | Can someone without *use* still edit the workflow? | Blocking edits makes workflows unmaintainable. | **Yes.** Edit allowed, publish and run blocked. Save-time protection already does this. |
| **D4** | What if there is no publishing identity? | Publishers get deleted; git-imported workflows have none. | **Fail closed** if the workflow uses a restricted credential. Otherwise fall back to the project owner. |
| **D5** | Should new credentials default to "just me"? | Moves ownership; touches offboarding, project deletion, git export. | **Not in v1.** Opt-in first, default later with an ownership-transfer story. |
| **D6** | Move credential roles onto the custom-role mechanism? | Credential grants store the role as a loose string, not an FK. | **Yes, but separately.** |
| **D7** | Can one credential be both "just me" and end-user? | The two are contradictory. | **Mutually exclusive**, enforced at publish. |
| **D8** | Which project is the home of a restricted credential? | Ownership sits in the personal project, but the credential appears in the team one (§3.3). | **Show it as personally owned, listed in the team project.** Keeping the owner grant as the single source of truth avoids breaking home resolution, deletion cascades and git export. |
| **D9** | Who becomes the owner when "just me" is switched on? | Credentials record no creator — ownership exists only as a grant pointing at a project — so for a credential already owned by a team project there is nobody to infer. | **Decided: whoever presses the toggle, always.** For existing credentials the toggle will most likely not be offered at all in the first version, which avoids the question in practice. |

---

## 10. Recommendation

**Phase 1 — Publishing identity.** Attach the already-recorded publisher to triggered
runs. Small, useful on its own — triggered runs have no attribution today — and required
by everything below. Also unblocks end-user credentials on schedules.

**Phase 2 — The capability split.** Add the *use* right and the Viewer role. Give *use* to
the existing sharing role so nothing changes for current installs. Fix the share
operation's role handling. Extend the existing subject-aware execution check to stored
workflows. Point save-time protection at *use*. Add the publish gate.

**Phase 3 — Execution visibility.** One new trigger in the redaction subsystem.
