---
name: instance-awareness
description: >-
  Load when the user's request depends on what is already on this instance rather
  than on what they just typed: a short or ambiguous opener ("fix it", "carry on",
  "what should I look at"), a reference to earlier work in a new conversation, a
  build that has to match how they already do things, or any question about what
  has recently run or broken. Also load before choosing between interchangeable
  nodes — a chat model, a store, a tracker — so the choice follows what this
  project already uses instead of a default.
recommended_tools:
  - activity
  - workflows
  - executions
  - credentials
---

# Instance Awareness

The conversation is not the only context you have. This instance carries a
record of what has been built, changed, run and broken, and what the user tends
to reach for. Most of it is cheap to read, and reading it is usually better than
asking.

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

### 0. The activity block you were already given

If a `<recent-activity>` block is in this turn, you already have what changed
recently, what ran, and what failed — free. Read it before your first tool call.

It is a set of pointers. Each line ends with the resource it is about, and the
bracketed number is a stable id. This is *what happened*; it is not the workflow
contents and not a statement of preference.

### 1. `activity(action="list")` and `activity(action="expand", id=N)`

`list` looks further back than the block, or filters to one category or one
resource. `expand` opens a single entry in full **and returns everything else
the log knows about the same resource** — which is how you see one workflow's
recent history in a single call.

Use `expand` when a line is interesting but thin: a failure whose node you need,
or a workflow you want the change history of. An id that no longer resolves is
ordinary — entries are pruned — so carry on rather than treating it as an error.

### 2. `workflows(action="node-usage")`

**This is how you learn preference.** With no `nodeType` it returns every node
type in use with the number of workflows using each, out of the total in scope.
No workflow is opened, and it costs roughly what one short paragraph costs.

Read it as a statement about the user:

- A type in almost every workflow is their default. Use it without asking.
- A type in *no* workflow is a choice they have not made. An absence is
  evidence, not a gap in the answer.
- Two competing types with similar counts is a genuine split — that is worth a
  question, and it is the only case where asking beats looking.

With a `nodeType` it names the workflows using it, most recently updated first,
so the top result is the freshest example.

### 3. One workflow, read in full

`workflows(action="get", workflowId)` on **one** example — the freshest from
rung 2, or the one the activity block points at. Node types come from rung 2;
this rung is for what rung 2 cannot express: parameter values, naming, retry
settings, error-workflow wiring, how they structure a prompt.

Read one, not several. If one example is not enough to see the pattern, there is
probably no pattern to follow.

## What each surface can and cannot tell you

| Question | Where it is answered |
|---|---|
| What did they just change? | activity block, rung 0 |
| What is broken right now? | activity block, or `activity(list, category="execution")` |
| Which workflow do they mean by "it"? | activity block — the most recent one they touched |
| What do they build with? | `node-usage`, rung 2 |
| What do they *never* use? | `node-usage` — the absence |
| Did the nightly job run? | activity block, then `executions` for the detail |
| How do they configure it? | one workflow, rung 3 |
| Do they have a credential for X? | `credentials(action="list")` |

## Choosing between interchangeable nodes

When a request needs a capability with more than one node behind it — a chat
model, a key/value store, an issue tracker, a way to iterate — check rung 2
before you decide. Then say what you did and why, in one clause: "using the
Anthropic chat model, which the other nine workflows here use". That sentence is
what turns a lucky guess into something the user can trust and correct.

If rung 2 shows nothing — a new instance, an empty project — say so and pick a
sensible default. Silence about an empty estate reads as a claim about it.

## Resolving a vague opener

"fix it", "carry on", "why is this broken", "what should I look at", or a new
conversation about work from yesterday: the answer is nearly always the most
recent thing in the activity block, and usually the most recent *failure*.

Name what you think they mean and act on it — "picking up the Nudge stale
Linear issues workflow, which failed twice this morning at Add Nudge
Comment" — rather than asking them to choose from a list they can already see.
If two candidates are equally recent, that is when to ask, and ask with the
candidates named.

## Where this stops

- **The log is not the workflow.** It records that a save happened and the node
  count changed, never which nodes. Anything about contents is rung 2 or 3.
- **An entry can outlive its resource.** A deletion entry points at a workflow
  that is gone; that is the entry doing its job.
- **Recent is not the same as typical.** The newest workflow may be the odd one
  out. When rung 0 and rung 2 disagree about what is normal here, rung 2 is the
  convention and rung 0 is the news — and the disagreement is often the most
  useful thing you can tell the user.
- **Do not narrate the feed.** It is context for reading their intent, not a
  status report. Unless they asked what has been happening, let it change what
  you do rather than what you say.
