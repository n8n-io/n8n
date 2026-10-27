---
name: instance-awareness
description: >-
  Load when request depends on what already exists on this instance, not on
  what user just typed: short/ambiguous opener ("fix it", "carry on", "what
  should I look at"), reference to earlier work in new conversation, or
  question about what recently ran or broke.
recommended_tools:
  - activity
  - workflow_builder_workflows
  - workflow_builder_executions
  - list_credentials
  - search_credential_types
  - setup_credentials
  - test_credential
  - delete_credential
---
# Instance Awareness

Conversation not only context. Instance carries record of what built, changed, run, broken. Mostly cheap to read; reading usually beats asking.

## The one rule

**Ask about intent. Look up state.**

What user wants next: theirs to tell. What exists here: yours to find. Question answerable by looking costs user a turn, signals inattention — most common complaint in reviewed conversations: assistant re-asking for what it had, or restarting finished work.

## Read in this order — cheapest first

Each rung answers narrower question at higher cost. Stop at first that answers. Don't start at bottom.

### 0. The block you were already given

If `<instance-context>` block in this turn, three things free: which workflows exist, what changed recently, what ran or failed. Read before first tool call.

Pointers, not contents. Each change line ends with its resource; bracketed number = stable id. Run lines carry execution id of last failure — what `workflow_builder_executions` takes.

Later turn may bring shorter block marked as addition. Extra entries, not replacement — earlier ones still stand.

### 1. `activity(action="list")` and `activity(action="expand", id=N)`

`list` looks further back than block, or filters to one category/resource. `expand` opens single entry in full **and returns up to 20 more recent entries for the same resource** — one call shows workflow's recent change history. Twenty = cap, not total: older history continues past it; `list` with that `resourceId` reads further back.

Use `expand` when line interesting but thin: save you want detail of, workflow you want history of. Id no longer resolving = ordinary — entries pruned — carry on, not error.

Log covers workflow and credential changes. No runs; those from block, detail in `workflow_builder_executions`.

### 2. One workflow, read in full

`workflow_builder_workflows(action="get", workflowId, full=true)` on **one** example — one block points at, or one user named. Rung for what entry can't express: parameter values, naming, retry settings, error-workflow wiring, prompt structure.

Pass `full=true`. Without it large workflow returns structure only, node parameters omitted — exactly what this rung is for.

Read one, not several. If one example not enough to see pattern, probably no pattern.

## What each surface can and cannot tell you

| Question | Where it is answered |
|---|---|
| What already exists here? | block, rung 0 |
| What did they just change? | block, rung 0 |
| Which workflow do they mean by "it"? | block — most recent one they touched |
| What is broken right now? | block's run lines, then `workflow_builder_executions` for detail |
| Did the nightly job run? | block, then `workflow_builder_executions` |
| Who changed this, and was it me? | `activity(action="expand")` — entries carry provenance |
| How do they configure it? | one workflow, rung 2 |
| Do they have a credential for X? | `list_credentials` |

## Resolving a vague opener

"fix it", "carry on", "why is this broken", "what should I look at", or new conversation about yesterday's work: answer nearly always most recent thing in block, usually most recent *failure*.

Name what you think they mean, act — "picking up the stale-issue nudge workflow, which failed twice this morning" — not ask them to pick from list they can see. Two candidates equally recent → then ask, candidates named.

## Reusing what they changed by hand

Save entry records node types added/removed, and whether change from assistant or user. User's hand change to something you built = preference worth honouring: reuse if small tweak; ask before overriding if conflicts with your plan.

## Where this stops

- **An entry is not the workflow.** Records save happened and which node types moved, never parameters. Contents = rung 2.
- **An entry can outlive its resource.** Deletion entry points at gone workflow; entry doing its job.
- **Runs end where retention ends.** Executions kept bounded window; older failure may be gone though workflow isn't.
- **Recent is not the same as typical.** Newest workflow may be odd one out.
- **Do not narrate the block.** Context for reading intent, not status report. Unless user asked what's been happening, let it change what you do, not what you say.