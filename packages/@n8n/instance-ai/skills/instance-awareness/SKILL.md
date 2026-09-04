---
name: instance-awareness
description: >-
  Load when the request depends on what is already on this instance rather than
  on what the user just typed: a short or ambiguous opener ("fix it", "carry on",
  "what should I look at"), a reference to earlier work in a new conversation, or
  any question about what has recently run or broken.
recommended_tools:
  - activity
  - workflows
  - executions
  - credentials
---

# Instance Awareness

The conversation is not the only context you have. This instance carries a
record of what has been built, changed, run and broken. Most of it is cheap to
read, and reading it is usually better than asking.

## The one rule

**Ask about intent. Look up state.**

What the user wants next is theirs to tell you. What already exists here is
yours to find out. A question you could have answered by looking costs the user
a turn and tells them you are not paying attention — and it is the most common
complaint in reviewed conversations: the assistant re-asking for something it
had, or restarting work it had already finished.

## Read in this order — cheapest first

Each rung answers a narrower question at a higher cost. Stop at the first one
that answers yours. Do not start at the bottom.

### 0. The block you were already given

If an `<instance-context>` block is in this turn, you already have three things
for free: which workflows exist here, what changed recently, and what has run
or failed. Read it before your first tool call.

It is a set of pointers, not contents. Each change line ends with the resource
it is about, and the bracketed number is a stable id. Run lines carry the
execution id of the last failure, which is what `executions` takes.

A later turn may bring a shorter block that says it is an addition. Those are
extra entries, not a replacement — the earlier ones still stand.

### 1. `activity(action="list")` and `activity(action="expand", id=N)`

`list` looks further back than the block, or filters to one category or one
resource. `expand` opens a single entry in full **and returns everything else
the log knows about the same resource** — which is how you see one workflow's
change history in a single call.

Use `expand` when a line is interesting but thin: a save you want the detail of,
or a workflow you want the history of. An id that no longer resolves is ordinary
— entries are pruned — so carry on rather than treating it as an error.

The log covers workflow and credential changes. It does not record runs; those
come from the block, and `executions` has the detail.

### 2. One workflow, read in full

`workflows(action="get", workflowId)` on **one** example — the one the block
points at, or the one the user named. This rung is for what an entry cannot
express: parameter values, naming, retry settings, error-workflow wiring, how a
prompt is structured.

Read one, not several. If one example is not enough to see the pattern, there is
probably no pattern to follow.

## What each surface can and cannot tell you

| Question | Where it is answered |
|---|---|
| What already exists here? | the block, rung 0 |
| What did they just change? | the block, rung 0 |
| Which workflow do they mean by "it"? | the block — the most recent one they touched |
| What is broken right now? | the block's run lines, then `executions` for the detail |
| Did the nightly job run? | the block, then `executions` |
| Who changed this, and was it me? | `activity(action="expand")` — entries carry provenance |
| How do they configure it? | one workflow, rung 2 |
| Do they have a credential for X? | `credentials(action="list")` |

## Resolving a vague opener

"fix it", "carry on", "why is this broken", "what should I look at", or a new
conversation about work from yesterday: the answer is nearly always the most
recent thing in the block, and usually the most recent *failure*.

Name what you think they mean and act on it — "picking up the stale-issue nudge
workflow, which failed twice this morning" — rather than asking them to choose
from a list they can already see. If two candidates are equally recent, that is
when to ask, and ask with the candidates named.

## Reusing what they changed by hand

A save entry records which node types were added or removed, and whether the
change came from the assistant or from the user. A change the user made by hand
to something you built is a preference worth honouring: reuse it if it is a
small tweak, and ask before overriding it if it conflicts with what you were
about to do.

## Where this stops

- **An entry is not the workflow.** It records that a save happened and which
  node types moved, never the parameters. Anything about contents is rung 2.
- **An entry can outlive its resource.** A deletion entry points at a workflow
  that is gone; that is the entry doing its job.
- **Runs end where retention ends.** The instance keeps executions for a bounded
  window, so an older failure may be gone even though the workflow is not.
- **Recent is not the same as typical.** The newest workflow may be the odd one
  out.
- **Do not narrate the block.** It is context for reading intent, not a status
  report. Unless the user asked what has been happening, let it change what you
  do rather than what you say.
