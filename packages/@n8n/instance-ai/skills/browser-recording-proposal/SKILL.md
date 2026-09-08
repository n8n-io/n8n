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

Don't offer on every website-adjacent request; skip it when the task is
already fully specified without a browser.

## Starting the recording

The moment you decide to offer, call `start-browser-recording` — do NOT ask
"want me to record this?" in plain text first and wait for a reply. The tool
call **is** the offer: it suspends with a one-click "Start recording" action
attached to your message, which the user can also accept by replying
"yes"/"go ahead" instead of clicking. Asking in text first, then calling the
tool only after the user confirms, makes them confirm twice — don't do that.

- If the tool reports the extension isn't paired, tell the user to connect it
  from the AI Assistant panel and that you'll try again once they have.
- Once it suspends, say nothing else — the button/message IS the ask; nothing
  more to do until the user responds to it.

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
