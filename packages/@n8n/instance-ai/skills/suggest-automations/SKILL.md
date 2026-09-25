---
name: suggest-automations
description: >-
  Offer the three most common automations for a user as a single-choice card,
  from your own knowledge of their team and their apps, then build the one
  they choose or offer more. The system preloads it on onboarding threads,
  where the opening card already asked the user about themselves.
  Use it on other threads when the user asks what they could automate or
  wants ideas for a first workflow.
recommended_tools:
  - ask-user
  - build-workflow
---

# Suggest automations

## Input

You need to know who the user is, at least their team and the apps they use.
The user knows little about n8n: no n8n vocabulary, and no questions about
tasks or pain points.

On an onboarding thread the conversation already holds an `<onboarding-answer>`
block with the user's team and apps, one line per question. Use every line of
the block. The answers are final: use them as they come and do not ask these
questions again. Two openings:

- The block is followed by your message "Got it! Tell me a little about how
  you use <their apps>." and the user's reply. The reply describes how they
  work, names a task in their own words, or names none. Start at step 1.
- The block is the latest message and one answer is free text the user typed
  into the card. Read that text first. A tool name is one of their apps: ask
  "Got it! Tell me a little about how you use <their apps>." and end the
  turn. A task: start at step 1 with it. Anything else, for example a wish to
  stop, a request about something else, a refusal or an insult: call
  `leave-onboarding`, then write a one-sentence reply that invites the user to
  explore the app and to come back with a task.

On any other thread, ask in ONE `ask-user` call: a `single` question "What
team are you on?" with the options Executive/Owner, Support, Product & Design,
Sales, IT, Engineering and Marketing, and a `multi` question "Which apps do you
use?" with the ten apps people use most at work, as product names such as
Slack or Google Sheets. Never run a command or read a file to find them.

## Flow

1. Pick three automations that each solve a different problem, ordered from
   the most to the least relevant. Each one runs on the user's apps and is
   realistic for n8n. When the user named a task, even a specific and
   complete one, suggestion one is that task in their words and the other two
   are what people on their team set up next to it. Otherwise pick the three
   that people on the team most often set up with the user's apps. The card
   always comes before a build: a specific task gets confirmed with one click,
   never built unasked. Decide in one step: do not run a command, read a file
   or write the reasoning out.
2. Write two sentences of text and no list: the card carries the options.
   First reflect the task in the user's words, for example "Got it: you want
   to capture leads from Gmail in HubSpot and make sure the sales team
   follows up." Then "Based on that, here are three ways n8n could help."
   Without a task, write the second sentence only, with the team and apps
   instead: "Here are three ways n8n could help a sales team with Gmail and
   Slack." Then ONE `ask-user` call with `questions` only: a `single`
   question "Which one feels like the best fit?", `required: true`, with
   four options: the three suggestions, most relevant first, and last
   `Show me other ideas`. `Show me other ideas` is an action that asks for
   three more suggestions, not a catch-all: always keep it as the fourth
   option. Leave `introMessage` out. Set `freeTextLabel` to `Share more
   context`: the card shows it as its built-in free-text row with a pencil
   icon. Never add "Something else", "Share more context" or "None of these"
   as an option.

   A suggestion is one option string of two lines: the title, a newline,
   then the description. The card shows the second line under the first.
   - Title: a short action phrase of at most 6 words that names the result,
     not the setup, for example "Capture new leads" or "Speed up customer
     follow-ups". Not a sentence, and no punctuation at the end.
   - Description: one plain sentence of at most 18 words about what the user
     gets. State no trigger, schedule, recipient or other process detail the
     user did not give. No Markdown, no n8n node names.
   - Apps: name only apps the user selected or named, at most two in one
     suggestion, and only where the name makes the suggestion clearer. With
     no app or one app from the user, describe the result without app names.
   Example option: "Capture new leads\nMove new enquiries into your sales
   process so nothing gets missed."
3. Read the answer.
   - A suggestion: its first line, the title, names the automation to build.
   - `Show me other ideas`: repeat step 2 with three automations not shown in
     this thread yet, after one sentence such as "Here are three more."
   - Free text that describes a task: that is the user's request; build it.
   - Free text that asks for a change, for example another app or a topic:
     repeat step 2 with three automations that fit it.
   - Free text that names no task and no change, for example "skip", "no" or
     "later", or `answered: false`: do not build. On an onboarding thread call
     `leave-onboarding`, then write a one-sentence reply, for example "No
     problem. Explore the app and tell me when you want to automate something."
4. Write exactly one line before the first tool call, `Building <title> now.`,
   and no other text until the `build-workflow` result. Load `workflow-builder`
   and build the automation with the user's apps the normal way, then follow
   `postBuildFlow.instructions` from the result. Ask about an app only for a
   step the user's list does not cover, one question per turn.

## Rules

- One `ask-user` call per turn. Keep every message under four sentences.
- A build needs a picked suggestion or a task in the user's words. Never
  start one after a skip, a dismissal, or free text that names nothing.
- No apps given: suggest what people on the team most often automate, and
  name no app.
- Talk about the automation, never about the mechanics. Do not say
  "validate", "workspace" or a file name in a message. Say what is being
  built and what the user gets, for example "Building the reminder now."
- If the user wants to stop the onboarding or asks for something unrelated,
  drop this flow. On an onboarding thread, whenever you stop asking the card
  questions, call `leave-onboarding` first and then reply. A reply that skips
  the questions without that call leaves the user stuck in the flow.
- Never ask for credentials, keys, or passwords in chat.
- Reply in the language the user writes in.
