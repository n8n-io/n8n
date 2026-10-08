---
name: make-automatic
description: >-
  Offers once to make a working workflow automatic with propose_automation.
  Load when the current turn's thread-context has a <repeatable-work> section,
  or when the user asks to automate a workflow, for example 'Make "Daily
  report" automatic'. Do not load for a one-off job that the user needs only
  once.
recommended_tools:
  - propose_automation
  - workflows
  - executions
---

# Make automatic

Use this skill to offer that a workflow runs on its own: on a schedule, or
each time its trigger fires. The `propose_automation` tool shows the user a
card. The user chooses on the card: "Turn it on", "Save, but leave it off" or
"Not now".

These instructions are in English. Text that the user sees stays in the
language of the conversation.

## When to offer

Offer in one of these cases:

- The `<repeatable-work>` section is in the `<thread-context>` of the current
  turn. n8n writes this section, not the user. It gives a score, reason codes
  and sometimes a suggested schedule. n8n sends it once in a chat. If the
  workflow does not work yet, offer later, when it works.
- The user asks you to automate a workflow, to turn it on, or to let it run on
  its own. The offer panel of the editor sends `Make "<workflow name>"
  automatic`.

## When not to offer

Do not offer in these cases:

- The job is one-off. The user needs its effect only once, for example a
  migration, a backfill, a clean-up, or an export of data that exists now.
  The `one-off-operations` skill asks whether to keep that workflow. Do not
  offer in the same message as that question. Offer only when the user keeps
  the workflow and wants to run it again.
- The user declined an offer in this chat. They chose "Not now", or they said
  no in the chat. Do not offer again, unless the user asks.
- This chat already has a `propose_automation` call for the workflow.
- The workflow has not run successfully yet. First build it, then run or
  verify it. Offer when it works. If the user asks to make it automatic now,
  offer now.
- You do not have the `propose_automation` tool.

## Find the workflow

- Use the workflow ID from the `build-workflow` result of this chat.
- The offer panel message gives the workflow name, not the ID. Find the ID in
  the chat first. If the chat does not have it, use
  `workflows(action="list")` and match the name.
- If more than one workflow has that name, ask the user which one.

## How to offer

Make one `propose_automation` call. The card is the question, so do not ask
in text first.

- `workflowId`: the ID of the workflow.
- `title`: the purpose of the workflow, in the words of the user. Keep it
  short, for example "Morning sales digest".
- `why`: 1 to 3 short reasons, from what the user said. For example "You asked
  for this every weekday at 08:00" or "You ran it twice in this chat".
- `cron`: the cron expression of the `suggested schedule` line, when there is
  one and the workflow starts with a Schedule Trigger. In all other cases,
  leave it out.
- Do not set `activate` or `versionId`. The user chooses on the card.

Do not make a second call while the card waits for an answer.

## After the answer

- `denied: true`: the user chose "Not now", or an admin blocked the action.
  Say nothing more about it. Continue with the conversation.
- `kept: true` and `active: true`: write one sentence that says the workflow
  is on and runs on its own.
- `kept: true` and `active: false` without `error`: write one sentence that
  says the workflow is saved and is off. The user can turn it on later.
- `kept: true` with `error`: n8n kept the workflow but could not turn it on.
  Write one sentence with the reason from `error`.
- `warnings`: tell the user about a warning only when it changes what they
  expect, for example when the schedule on the card is not the schedule they
  asked for.
- A tool error: write one sentence that says what went wrong. Do not try again
  unless the user asks.
