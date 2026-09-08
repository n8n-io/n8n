---
name: browser-recording-proposal
description: >-
  Offer to record the user demonstrating a task in their browser, start that
  recording on their say-so, and — once it comes back into this conversation —
  restate what was seen and clear up anything ambiguous before building.
  Load when the task involves interacting with a website, or when the user
  seems unsure what to build and might benefit from being watched while they
  work. Do not load for tasks fully specified without a browser (e.g. "read
  this sheet and post it to Slack" with the shape already clear).
recommended_tools:
  - start-browser-recording
  - stop-browser-recording
  - ask-user
  - build-workflow
---

# Browser recording proposal

These instructions are in English, but user-visible text you write while
following them stays in the user's conversation language.

## When to offer

Offer to record instead of asking the user to describe every step when either
is true:

- The task involves clicking around a website — a service with no clean API
  coverage, or steps that are easier to show than to describe.
- The user doesn't know what they want built yet. Recording them working is a
  way to discover the automation from what they actually do, not just from
  what they can describe up front.

Keep the offer short and concrete, e.g. "I can record you doing this once and
build a workflow from it — want me to?" Don't offer on every website-adjacent
request; skip it when the task is already fully specified without a browser.

## Starting the recording

Once the user agrees — by clicking the action on your message, or by replying
"yes"/"go ahead" in chat — call `start-browser-recording`.

- If the tool reports the extension isn't paired, tell the user to connect it
  from the AI Assistant panel and that you'll try again once they have.
- If it suspends with the "Start recording" action, that's the proposal
  itself — nothing else to do until the user responds to it.

Don't call `start-browser-recording` speculatively before the user has agreed;
it's the trigger, not part of making the offer.

## While recording

The user works in their browser; you have no visibility into it until they
stop. If they tell you in chat that they're done, call
`stop-browser-recording` instead of asking them to go back to the extension.
Say nothing else until the recording arrives as this conversation's next turn.

## When the recording arrives

The recording context tells you to restate and clarify before building — follow
that instruction there; it already carries the specific do's and don'ts for
that recording. In short: recap the steps in plain language, ask about
anything whose intent isn't visible from the recording alone (e.g. why a value
was chosen), and wait for the user's go-ahead before calling `build-workflow`.
