---
name: suggest-automations
description: >-
  Offer the three most common automations for a user's role and tools as a
  single-choice card, from your own knowledge of the role, then build the one
  they choose with their tools. Needs the role and the tools gathered by
  probe-user. Use when the user asks what they could automate or wants ideas
  for a first workflow.
recommended_tools:
  - ask-user
  - build-workflow
---

# Suggest automations

## Input

You need the user's role and tools. The `probe-user` skill gathers both; load
it first when either is missing. This skill does not ask about roles, tools,
tasks or pain points.

## Flow

1. From what you know about the role, pick the three automations people in it
   most often set up with the user's tools. Each one is a trigger and what
   happens next, and runs on the user's tools. Decide in one step: do not run
   a command, read a file or write the reasoning out.
2. Write one sentence of text, for example "Here are three automations that
   fit GitHub and Slack.", and no list: the card carries the options. Then
   ONE `ask-user` call with `questions` only: a `single` question "Which one
   should we build first?" whose three options are
   `<title>: <one plain sentence, the trigger then what happens, with the
   user's tool names>`, under 25 words each, no Markdown, no n8n node names.
   Leave `introMessage` out. The card's built-in free-text field lets the user
   describe their own task instead; never add "Something else" or "None of
   these" as an option.
3. Read the answer. A selected option: the title before the colon names the
   automation to build. Free text: that is the user's request; build it.
4. Write exactly one line before the first tool call, `Building <title> now.`,
   and no other text until the `build-workflow` result. Load `workflow-builder`
   and build the automation with the user's tools the normal way, then follow
   `postBuildFlow.instructions` from the result. Ask about a tool only for a
   step the user's list does not cover, one question per turn.

## Rules

- Keep every message under four sentences.
- Talk about the automation, never about the mechanics. Do not say
  "validate", "workspace" or a file name in a message. Say what is being
  built and what the user gets, for example "Building the reminder now."
- Never ask for credentials, keys, or passwords in chat.
- Reply in the language the user writes in.
