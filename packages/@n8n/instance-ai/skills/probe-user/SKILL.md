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
    # Card option to use-case corpus role id (knowledge-base/use-cases/<id>.md).
    # The backend resolves this; a skipped or free-text answer maps to `other`.
    roles:
      Business owner: business-owner
      Customer support: customer-support
      Data science: data-science
      DevOps: devops
      Engineering: engineering
      IT: it
      Product & Design: product-design
      Sales & Marketing: sales-and-marketing
      Security: security
---

# Probe the user

## Purpose

Collect two facts, then hand over: the user's role id and the tools they use.
This skill asks; it never suggests automations or builds. The user knows
little about n8n, so no n8n vocabulary and no extra questions.

## Step 1: the role

On an onboarding thread the thread already shows your greeting and the
question "What best describes your role?" as an `ask-user` card. The
`<onboarding-answer>` block in the first user turn holds the answer in the
`ask-user` result format and ends with `Use-case corpus role id: <id>`. That
id is final: use it as is, do not map the answer yourself, and do not ask
about the role again. `answered: false` or `skipped: true` means the user
skipped the card, and the id is `other`.

On any other thread, ask the role yourself: ONE `ask-user` call, a `single`
question "What best describes your role?" with these nine options, then map
the answer with this table. Free text that fits no row maps to `other`.

| Option            | Role id             |
| ----------------- | ------------------- |
| Business owner    | business-owner      |
| Customer support  | customer-support    |
| Data science      | data-science        |
| DevOps            | devops              |
| Engineering       | engineering         |
| IT                | it                  |
| Product & Design  | product-design      |
| Sales & Marketing | sales-and-marketing |
| Security          | security            |

## Step 2: the tools

1. Acknowledge the role in one sentence. Do not list n8n features.
2. In the same turn, ONE `ask-user` call with a `multi` question "Which tools
   do you use?". Options: the `Tools card options` line of the
   `<onboarding-answer>` block, verbatim and in that order. Do not add, drop,
   merge or reword an option, and do not add a family or a note in brackets:
   `suggest-automations` matches the selected options against the corpus by
   name. The card has a built-in free-text field for other tools; never add
   "Other" or "None of these" as an option.
3. No `Tools card options` line, or an empty one (another thread, or a role
   without options): ask a `text` question "Which tools do you use? For
   example Slack, Gmail or Google Sheets." Never write options yourself, and
   never run a command to find them.

## Step 3: hand over

Load the `suggest-automations` skill and follow it with the role id and the
list of tools (selected options plus free text). Do not describe automations
before that skill is loaded.

## Rules

- One `ask-user` call per turn, under four sentences of text around it.
- Skipped tools card: hand over with an empty tools list.
- If the user asks for something unrelated, drop this flow and help them.
- Never ask for credentials, keys, or passwords in chat.
- Reply in the language the user writes in.
