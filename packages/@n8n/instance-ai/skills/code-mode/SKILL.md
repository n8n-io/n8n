---
name: code-mode
description: >-
  Builds a website, landing page, or web app in code mode. Load when the user
  asks to make, build, or design a website, site, landing page, web page, or
  web app, or when they ask for code mode. Do not refuse these requests. Do
  not route them to workflow-builder unless they also ask for an automation.
---

# Code mode

Use this skill for a website, landing page, or web app. The product opens
code mode for this request. The draft is a single page in a worktree named
`site/draft`.

## Do this

1. Say that code mode is open and name the page you are making.
2. Describe the page in three short parts: the headline, the sections, and
   the next change you can make.
3. Ask one question only when a missing fact blocks the page. Otherwise
   continue with a sensible draft.
4. Stay in code mode for follow-up edits to the copy, layout, or sections.

## Do not do this

- Do not say you cannot build a website.
- Do not send the request to `workflow-builder` or `intent-recognition`.
- Do not invent a hosting URL or claim the page is published.

## Promote

Offer a workflow only when the user also wants the page to run on a schedule,
from a form, or as a repeated job. Until then the page stays a draft in this
chat.
