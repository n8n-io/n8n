# Tickets: credential-level "only me" sharing

Draft tickets from [the spike](./granular-credential-sharing.md). Ready to paste into
Linear. Order matters — dependencies are noted on each.

---

## Project description

Adding a credential to a project today makes it usable by everyone in that project.
There's no middle ground: either people can't see it at all, or they can send email as
you.

That's what enterprise customers keep running into. They want teammates and admins to see
which credentials a project uses — for audit, and so someone can pick up a workflow while
its owner is away — without those people being able to actually use them.

This project separates the two. A credential can be marked "only me": still listed in the
project, still visible on the nodes that use it, but only its owner can run or publish
workflows with it. Everyone else can open the workflow, read it, change the logic and
save. They just can't execute it, publish it, or see the data that came back through it.

For scheduled and polling workflows, where nobody is actively running anything, we also
need to record who published a workflow and run it as them. That's the first piece of
work, and it's worth doing on its own — triggered runs currently have no attribution at
all.

**Not in this project:** sharing with a few named people instead of just the owner, and
end-user credentials. The latter already exist and answer a different question — acting
as whoever is running the workflow, rather than always as the owner.

---

Nothing before T7 changes what users see. T1–T6 can ship quietly and be validated on
their own; the feature turns on with T7.

```
T1, T2, T3    no dependencies — start in parallel
T4            needs T1, T3
T5, T6        need T3
T7            needs T2, T3, T4  ← the feature becomes possible here
T8, T9, T10   need T7
T11           needs T4, T7
```

| | Ticket | Size | Priority |
|---|---|---|---|
| T1 | Attach the publishing user to triggered executions | M | P0 |
| T2 | Make credential sharing work with more than one role | S | P0 |
| T3 | Add a "use" right for credentials | S | P0 |
| T4 | Check credentials against the person running the workflow | **L** | P0 |
| T5 | Block publishing a workflow you couldn't run | S | P0 |
| T6 | Point save-time protection at the new right | XS | P0 |
| T7 | Add the "only me" credential role | XS | P0 |
| T8 | Write two grants when a credential is created as "only me" | M | P0 |
| T9 | The "only me" toggle, and showing restricted credentials correctly | M | P0 |
| T10 | Make "only me" and end-user credentials mutually exclusive | S | P1 |
| T11 | Hide execution data from people who can't use the credential | M | P1 |

**P0** = the feature isn't correct without it. **P1** = ship straight after; the
restriction already works, but the story isn't complete.

Two notes on the sizing:

**T4 is the only large one** and everything else is small by comparison. If it slips, the
whole thing slips — worth starting first and giving it the most experienced pair of hands.

**T6 looks trivial and is security-relevant.** Without it, someone who can see but not use
a credential can still drop it into a node and save. They can't run or publish it
themselves — but the owner might, and then the node runs against the owner's account.
That's exactly the impersonation this feature exists to prevent, so don't let the XS
fool you into deprioritising it.

---

## T1 — Attach the publishing user to triggered executions

**Why.** When a schedule or webhook fires, the run has no user attached at all. That means
no attribution in the UI, and nothing to check permissions against later.

We already write down who published a workflow, every time — we just never read it back.

**What to do.**
- Add a repository method to look up the publisher of a workflow's active version.
- Pass that user into `getBase()` where activated workflows and webhooks build their
  execution context.
- Handle the case where there's no publisher (deleted user, workflow imported from git) —
  for now, just leave it empty and log it.

**Done when.** A scheduled run shows who published the workflow, the same way a manual run
shows who started it.

**Depends on.** Nothing. Can start immediately.

---

## T2 — Make credential sharing work with more than one role

**Why.** The share endpoint finds current recipients by matching one hard-coded role name,
and always writes that same name. Any grant with a different role is invisible to it — it
won't be listed, and unsharing won't remove it.

Right now that's harmless because only one role is ever written. The moment we add a
second one it becomes a permission leak: you press "remove access" and access stays.

**What to do.**
- Treat every non-owner grant as a share, not just the one role.
- Let the caller specify the role when sharing, defaulting to today's behaviour.

**Done when.** Sharing, listing and unsharing all behave correctly regardless of which
role a grant carries.

**Depends on.** Nothing. Must land before T7.

---

## T3 — Add a "use" right for credentials

**Why.** Today there's no way to say "you can see this credential but not use it" — being
able to use one is inferred from being able to read it. Splitting the two is the basis for
everything else.

Careful with naming: `credential:connect` already exists and means something different
(connecting your own account to an end-user credential). Don't pick anything that reads
like it.

**What to do.**
- Add the new right to the scope list.
- Give it to the `credential:owner` and `credential:user` roles.
- **Also give it to `project:admin`, `project:editor` and `project:personalOwner`.**

That last point is easy to miss and breaks everything if you do. Effective access is the
*intersection* of someone's project role and the credential role on the grant — a right
has to be in both or it's gone. Add it only to the credential roles and nobody ends up
with it.

Project viewers don't need it: they can't execute workflows at all.

There's precedent right there in the code — `credential:createEndUser` had to be added to
the owner role for exactly this reason, with a comment explaining why.

**Done when.** The right exists and is synced to the DB on boot. Nothing changes for
anyone — every existing grant keeps exactly the access it has now. Worth a test that
asserts this.

**Depends on.** Nothing.

---

## T4 — Check credentials against the person running the workflow

**Why.** Before a workflow runs we only check whether the credential is shared with a
project the workflow belongs to. We never check who's running it, and we ignore the access
level on the grant entirely — any share of any kind lets the run through.

We already have the check we want; it's just only wired up for sub-workflows defined
inline in a node parameter, which have no project of their own.

**What to do.**
- Extend that user-based check to cover stored workflows too, using the publisher from T1
  for triggered runs and the session user for manual ones.
- **Only apply it to credentials that carry a restrictive grant** — meaning at least one
  grant without the "use" right. Everything else keeps today's project-based check.
- Error messages should name the credential and the node, and say who to ask.

**Why only restrictive ones.** Swapping the project check for a user check across the
board would be a real behaviour change: triggered runs would start depending on the
publisher still having access, and workflows shared into several projects would lose the
union of those projects. Scoping it to restricted credentials means **this ticket changes
nothing at all** — no such credential can exist until T7 — and the blast radius afterwards
is exactly the set someone deliberately restricted.

Edge case worth a test: a credential shared into one project as viewer and another as
user. It counts as restricted, so it gets the user check — and a member of the second
project still passes, through that project's grant.

**Done when.** A user without the "use" right on a restricted credential can't run a
workflow that uses it, manually or on a trigger. Nothing else changes.

**Depends on.** T1, T3.

**Not in scope.** The project-based check ignoring who runs the workflow is a real defect
for ordinary credentials too, but there's nothing to bypass there — those credentials
aren't restricted. Fixing it properly means measuring the fallout across the fleet first;
tracked separately.

---

## T5 — Block publishing a workflow you couldn't run

**Why.** Publishing is its own permission, and publish-time validation already looks at
credentials — but only end-user ones. For ordinary credentials there's no check.

So without this, the whole feature is one click away from being bypassed: I can't run the
workflow myself, but I can publish it and let the schedule run it for me.

**What to do.**
- Add a rule to the existing publish validation: reject if the publisher lacks the "use"
  right on any credential the workflow references.
- Match the wording style of the end-user credential errors already there.

**Done when.** Publishing fails with a clear message naming the credential.

**Depends on.** T3.

---

## T6 — Point save-time protection at the new right

**Why.** Saving a workflow with a credential you can't access already does the right
thing: those nodes get restored to their previous state, and new nodes referencing them
are rejected. You can still rename, move and disable them.

It just checks the wrong right — "read" instead of "use".

**What to do.** Swap the right. Small change.

**Done when.** Someone who can see a credential but not use it can still edit the rest of
the workflow and save.

**Depends on.** T3.

---

## T7 — Add the "only me" credential role

**Why.** This is the role that makes the restriction expressible: see the credential, but
don't use it.

Deliberately after T4 — if the role exists before the check enforces it, people will turn
on "only me" and believe they're protected while the credential is still usable.

**What to do.**
- Add a `credential:viewer` role with the read right and nothing else.
- Make sure it shows up in the roles API for the sharing UI.

**Done when.** The role exists and can be assigned through the API.

**Depends on.** T2, T3, T4.

---

## T8 — Write two grants when a credential is created as "only me"

**Why.** A grant says which credential, to which project, at what level. There's no field
for a person — so a level always applies to everyone in the project.

That means "only Alice can use this, but Marketing can see it" needs two grants: owner to
Alice's personal project, viewer to Marketing. Alice gets access through her personal
project; everyone else only through Marketing.

**What to do.**
- When creating a credential in a team project with "only me" on, write the owner grant to
  the creator's personal project and a viewer grant to the team project, instead of one
  owner grant to the team.
- When creating in a personal project, just add the viewer grant for whichever projects
  it's shared into.
- Owner is always whoever performed the action.

**Scope note.** Only the creation path. Turning "only me" on for a credential a team
already owns would mean moving ownership between projects, and we have no record of who
created it — leaving that out for now. Turning it *off* is fine and should work (it just
upgrades the team grant from view to use).

**Done when.** Creating a credential with "only me" produces two grants, and the creator
is the only one who can use it.

**Depends on.** T7.

---

## T9 — The "only me" toggle, and showing restricted credentials correctly

**Why.** Two bits of UI: somewhere to turn the restriction on, and the editor showing the
right thing to everyone else.

"Only me" is a property of the credential, not a per-recipient setting. When it's on, any
project it's shared into gets a view-only grant; turn it off and they all become usable.
So **the share dialog itself doesn't change** — it stays a list of projects, and the level
is implied.

**What to do.**
- Add the toggle to the credential modal, at creation time (see T8 on why creation only).
- Split the "user has access to this credential" flag the editor uses into "can see" and
  "can use". Read-only node rendering already exists — it just needs the right flag.
- A colleague should see the credential's name and type on the node, with the node
  read-only, rather than an empty or broken-looking credential field.

**Done when.** Creating a credential with the toggle on makes it visible but unusable to
everyone else in the project, and their editor shows why.

**Not in scope.** Picking a different level per project. That's only needed for sharing
with a few named people (§3.4 in the spike), which is a later thing.

**Depends on.** T7.

---

## T10 — Make "only me" and end-user credentials mutually exclusive

**Why.** They contradict each other. An end-user credential resolves to whoever is running
the workflow; "only me" fixes it to one person. A credential can't be both.

**What to do.**
- Don't offer the "only me" toggle on end-user credentials, and vice versa.
- Enforce it server-side too, in the existing publish validation.

**Done when.** The two options can't be combined, and the UI explains why rather than just
disabling a control.

**Depends on.** T7.

---

## T11 — Hide execution data from people who can't use the credential

**Why.** Someone who can't use a credential shouldn't see what came back through it.

The redaction subsystem already exists, and it already has a rule shaped exactly like
this one: executions that used end-user credentials can only be revealed by the person
they ran as, and an admin's reveal permission doesn't override it.

**What to do.**
- Add a second trigger next to it: redact when the viewer lacks the "use" right on any
  credential the run touched.
- Keep the same property — reveal permission doesn't bypass it.
- Reuse the coarse strategy that clears everything. Don't redact per node: a Gmail node's
  output is the next node's input, so hiding one node hides nothing.

**Done when.** A colleague who can see but not use a credential sees the run happened, but
not the data.

**Depends on.** T4, T7.

---

## Still open

Two product questions worth settling before T8 and T9 (see D5, D8 in the spike):

- **Offboarding.** With "only me", the credential is owned by a person's personal project.
  When they leave, it stays visible to the team but usable by nobody. We need a handover
  story.
- **Which project is "home".** The credential is owned personally but appears in a team
  project. Recommendation in the spike is to show it honestly as personally owned — worth
  confirming with design.
