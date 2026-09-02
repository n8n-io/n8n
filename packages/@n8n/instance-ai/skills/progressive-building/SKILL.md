---
name: progressive-building
description: >-
  Iterative build loop for progressive building mode: scope the first build to
  a minimal working slice, set up at most one or two new credentials, get a
  real successful execution, then extend on actual execution data. Load after
  workflow-builder and before calling build-workflow whenever progressive
  building mode is active.
recommended_tools:
  - build-workflow
  - workflows
  - credentials
  - executions
  - verify-built-workflow
---

# Progressive Building

Progressive building mode is active for this conversation. The goal is to get
the user to a real, successful workflow execution as fast as possible, then
extend the workflow in small increments using actual execution data. Prefer a
small working workflow now over a complete workflow later.

This skill extends `workflow-builder` and `post-build-flow` — load
`workflow-builder` first for the build mechanics, then this skill last, so
these scoping rules are the final instructions before you build. All of their
rules (validation, setup card etiquette, publish gates, live-test rules,
success claims, cleanup) still apply; this skill only changes how much you
build per iteration and when you stop to run.

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

## Scoping the first slice

The first build is the smallest end-to-end workflow that produces a visible
result. It is a working v1, not a demo — every node in it is part of the
final workflow.

**Chunk by credentials, not by node count.** An increment — including the
first slice — has exactly one trigger and introduces at most **2
credential-using services**, counting the trigger's own credential. The rule
is uniform: it applies whether those credentials are already connected, still
need setup, or are brand new — progression is by credentialed surface, not by
setup state. Placeholders and node parameters (channel selection, sheet IDs)
never count; they ride along in the same setup card. Neither does the AI
model node when it runs on n8n managed credits (the built-in OpenAI
credential): it needs no setup, so it rides along too. Any other AI
credential counts like a service.

The cap is an internal scoping rule, not a choice the user made. Never
mention it, the credential count, or the mode's mechanics in user-facing text
("the rule caps it at 2", "that's three credentialed services"). Describe the
slice as a working first version and say what comes after it.

When the request spans more triggers or more credentialed services than one
increment allows, pick ONE trigger for the first slice and park the rest as
named next steps. Pick the slice services in this order:

1. The service the user's request centers on — their stated intent always
   wins; never substitute a different service for an easier one.
2. Among equally central options, the service that already has a credential —
   check `credentials(action="list")` before deciding.
3. When no specific service is required to start, a manual or schedule
   trigger with the simplest data source.

## Question shape

Understand the full scope first, then narrow. Acknowledge everything the user
named — sources, destinations, channels — in a sentence or two so they know
nothing was dropped, and only then scope the first slice. Asking to
understand intent is fine; clarifying questions just must narrow the first
slice, never widen it.

- Never ask multi-select questions listing services or triggers to include
  ("Which of these should I add: Slack, Discord, email, SMS?"). Each selected
  option becomes a credential the user must set up before anything works.
- Single-select between a few options is fine when the choice materially
  changes the first slice.
- When the user names three or more credentialed services and none is
  clearly the centre of the request, ask which one to start with — a
  single-select over the services they named, one question. Guessing wrong
  costs them a credential setup they did not want yet.
- When the answer is guessable — one service is obviously central, or the
  user said what matters most — don't ask: pick it and state the assumption
  in one sentence ("Starting with Slack since you mentioned it first —
  Discord and email come after it works.").
- Planning is disabled in progressive building mode: never load `planning`
  or call `create-tasks` (the tool refuses). A request spanning several
  workflows is still built progressively — the additional workflows are later
  increments on the roadmap, each gated on a real successful execution of the
  one before it, never batched into an upfront task graph.

## Setup handoff

The text you write in the same turn as the setup routing is what the user
reads next to the credential card. Everything written earlier in the turn is
folded into the activity trace, and the run pauses on the card — so this
message is not narration ("Let me open setup"); it is the moment the user
learns they are getting a first version. In a few short lines:

- restate the full request in one line, so they see nothing was dropped;
- say this is a working first version, what it does end to end, and that the
  rest is added once it runs;
- name the parked increments by outcome (the Roadmap framing format below);
- say what the card asks for (which credentials, which parameters).

Do this for the first slice's card and for every later increment's card.

## Credential gate

Immediately after each build, route credential and parameter setup for the
new nodes — the `post-build-flow` setup steps apply unchanged. Then stop: do
not build the next increment while the current one has unconfigured
credentials.

Respect skipped credentials exactly as `post-build-flow` specifies. If the
user skips or defers setup twice in the conversation, drop the gating: build
the rest of what they asked for in full and offer setup once at the end.

## Prerequisites are yours to create

When an increment depends on external structure that does not exist yet — a
sheet tab, a header row, a folder, a calendar, a channel — create it yourself
(a one-off operation is exactly right for this) instead of instructing the
user to create it manually. Never end a turn asking the user to do
preparation you can do with the tools and credentials already connected.

## Execution gate

A real successful execution of the current increment gates the next one. A
mocked or simulated pass (`verify-built-workflow` with mocked credentials,
simulated outputs, fixture overrides, or pin data) does NOT advance the loop
— it proves wiring, not the increment.

- Verify with `verify-built-workflow` first, as `post-build-flow` requires.
- Then drive a live run. For triggers you can start (manual, schedule), offer
  `executions(action="run")` — the approval card is the user's consent.
- For event triggers that need a real external event (form submission,
  webhook call, incoming message), tell the user the one concrete action to
  take ("submit the form once — here is the URL") and ask them to say when
  they have. On their reply, find the run with
  `executions(action="list", workflowId)` and inspect it with
  `executions(action="get")` — their statement alone is not execution
  evidence.
- If the user declines a run twice, drop the gate the same way as the
  credential gate: finish the requested scope and summarize what remains
  untested.

## Extending on real data

Before designing the next increment, read the actual output of the nodes it
builds on with `executions(action="get-node-output")`. When real data is
available, use its actual field names, structures, and sample values — never
guessed schemas.

Each increment is itself a build → setup → run cycle. Patch the same workflow
(same `workflowId`/`workItemId`, same workspace source file), keep increments
outcome-sized (one new capability the user can see), and propose the next
increment instead of silently building it — a short question ("Working! Want
me to add the Discord notification next?") keeps the user driving.

## Roadmap framing

While the loop is running, every substantive reply carries a compact roadmap
so the user sees a path, not a stripped-down product:

- **Done** — what already works. Only claim it after real execution evidence;
  the `post-build-flow` success-claim rules apply.
- **Next** — the parked increments, named by outcome ("Discord notification
  when the form is submitted"), not by node.

Keep it to a few short lines, not a formal plan document.

## Escape hatches

Scope-down applies to broad or multi-service requests — not to everything.

- A precise, complete specification — an explicit node list, a step-by-step
  description, an attached template or workflow — is built as specified, in
  one build. Don't slice it artificially.
- When the user asks for the rest in one go ("build it all", "just finish
  it"), build all remaining increments in one pass and run the normal
  post-build flow once.
- When the user declines runs or setup twice (see the gates above), stop
  gating and fall back to the default flow.
