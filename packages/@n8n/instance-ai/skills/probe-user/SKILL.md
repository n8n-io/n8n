---
name: probe-user
description: >-
  Gathers the context needed to suggest automations: the user's role and the
  tools they work with, two cards at most. The system preloads it on
  onboarding threads, where the opening card already asked the role. Load it
  on other threads when you need the role and tools before suggesting
  automations. Suggesting is the job of suggest-automations.
recommended_tools:
  - ask-user
metadata:
  # Stored with the thread before the agent's first turn. The UI shows the
  # greeting as the first assistant message and the questions as an ask-user
  # card; the answer reaches the agent in an <onboarding-answer> block on the
  # first user turn. {{firstName}} becomes the user's first name, or "there".
  opening:
    title: Welcome to n8n
    greeting: >-
      Hi {{firstName}}, welcome to n8n! I am the n8n Assistant. I can build
      workflows with you, connect your tools, and answer questions about n8n.
      Tell me a little about yourself so I can suggest a good first automation.
    questions:
      - id: role
        question: What best describes your role?
        type: single
        options:
          - Business owner
          - Customer support
          - Data science
          - DevOps
          - Engineering
          - IT
          - Product & Design
          - Sales & Marketing
          - Security
---

# Probe the user

## Purpose

Collect two facts, then hand over: the user's role and the tools they use.
This skill asks; it never suggests automations or builds. The user knows
little about n8n, so no n8n vocabulary and no extra questions.

## Step 1: the role

On an onboarding thread the thread already shows your greeting and the
question "What best describes your role?" as an `ask-user` card. The
`<onboarding-answer>` block in the first user turn holds the answer in the
`ask-user` result format: the selected option, or the free text, is the role.
Do not ask about the role again. `answered: false` or `skipped: true` means
the user skipped the card: the role is unknown.

On any other thread, ask the role yourself: ONE `ask-user` call, a `single`
question "What best describes your role?" with these nine options: Business
owner, Customer support, Data science, DevOps, Engineering, IT, Product &
Design, Sales & Marketing, Security.

## Step 2: the tools

1. Acknowledge the role in one sentence. Do not list n8n features.
2. In the same turn, ONE `ask-user` call with a `multi` question "Which tools
   do you use?". Write the options yourself from what you know about the role:
   the tools people in that role use most, as product names such as Slack or
   Google Sheets, ten at most. Unknown role: the tools most people use at
   work. No n8n node names, no notes in brackets. The card has a built-in
   free-text field for other tools; never add "Other" or "None of these" as
   an option.
3. Never run a command or read a file to find the options.

## Step 3: hand over

Load the `suggest-automations` skill and follow it with the role and the
list of tools (selected options plus free text). Do not describe automations
before that skill is loaded.

## Rules

- One `ask-user` call per turn, under four sentences of text around it.
- Skipped tools card: hand over with an empty tools list.
- If the user asks for something unrelated, drop this flow and help them.
- Never ask for credentials, keys, or passwords in chat.
- Reply in the language the user writes in.
