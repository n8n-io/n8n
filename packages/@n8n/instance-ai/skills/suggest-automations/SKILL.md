---
name: suggest-automations
description: >-
  Offer three most common automations for user as single-choice card, from own
  knowledge of their team and apps, then build chosen one once confirmed, or
  offer more. System preloads it on onboarding threads, where opening card
  already asked user about themselves. Use on other threads when user asks
  what they could automate or wants first-workflow ideas.
recommended_tools:
  - workflow_builder_ask_user
  - workflow_builder_build_workflow
---
# Suggest automations

## Input

Need know who user is: at least team + apps used.
User knows little n8n: no n8n vocabulary, no questions about
tasks or pain points.

Onboarding thread: conversation already holds `<onboarding-answer>`
block with user's team + apps, one line per question. Use every line.
Answers final: use as-is, never re-ask. Two openings:

- Block followed by your message "Last one: what do you usually do in
  <their apps>?" and user reply. Reply describes how they
  work, names task in own words, or names none. Start step 1.
- Block is latest message, one answer is free text user typed
  into card. Read that text first. Tool name = one of their apps: ask
  "Last one: what do you usually do in <their apps>?" and end turn. Task:
  start step 1 with it. Anything else (wish to stop, request about other
  thing, refusal, insult): call
  `leave-onboarding`, then one-sentence reply inviting user to
  explore app and come back with task.

Any other thread: ask in ONE `workflow_builder_ask_user` call: `single` question "What
team are you on?" with options Executive/Owner, Support, Product & Design,
Sales, IT, Engineering, Marketing, and `multi` question "Which apps do you
use?" with ten apps people use most at work, as product names like
Slack or Google Sheets. Never run command or read file to find them.

## Flow

1. Pick three automations, each solving different problem, ordered
   most to least relevant. Each runs on user's apps, realistic for n8n.
   User named task (even specific + complete): suggestion one = that task
   in their words, other two = what people on their team set up next to it.
   Else pick three that team people most often set up with user's apps.
   Card always before build: specific task gets picked + confirmed,
   never built unasked. Decide in one step: no command, no file read,
   no written reasoning.
2. Short text, no list: card carries options. First
   reflect what user shared, their words, no added assumptions:
   - A goal or a problem: "Thanks, that helps. You want to ..."
   - A clear workflow: "Thanks, that helps. You use <app> and <app> to ..."
   - A general situation or activities: "Thanks, that helps. Your work
     involves ..."
   Say "You want" only when user named outcome they want. Then
   matching social proof:
   - A goal or a problem: "I've looked at how other users have solved
     similar problems."
   - A clear workflow: "I've looked at how other users approach similar
     workflows."
   - A general situation: "I've looked at how other users make their work
     easier."
   Then, after blank line, "Here are three ways n8n could help:". Nothing
   to reflect: drop first part, use general social proof.
   Then ONE `workflow_builder_ask_user` call with `questions` only: `single`
   question "Which one feels most useful?", `required: true`,
   four options: three suggestions, most relevant first, last
   `Show me other ideas`. `Show me other ideas` = action asking for
   three more suggestions, not catch-all: always keep as fourth
   option. Leave `introMessage` out. Set `freeTextLabel` to `Share more
   context`: card shows it as built-in free-text row with pencil
   icon. Never add "Something else", "Share more context" or "None of these"
   as option.

   Suggestion = one option string, two lines: title, newline,
   description. Card shows second line under first.
   - Title: short action phrase, max 6 words, naming result,
     not the setup, for example "Capture new leads" or "Speed up customer
     follow-ups". Not a sentence, and no punctuation at the end.
   - Description: one plain sentence, max 18 words, about what user
     gets. State no trigger, schedule, recipient or other process detail the
     user did not give. No Markdown, no n8n node names.
   - Apps: name only apps user selected or named, max two in one
     suggestion, and only where the name makes the suggestion clearer. With
     no app or one app from the user, describe the result without app names.
   Example option: "Capture new leads\nMove new enquiries into your sales
   process so nothing gets missed."
3. Read answer.
   - Suggestion: first line (title) names automation. Go to
     step 4.
   - `Show me other ideas`: repeat step 2 with three automations not shown in
     this thread yet, after one sentence such as "Here are three more."
   - Free text describing task: that is user's request. Give it a
     title as in step 2 and go to step 4.
   - Free text asking for change, e.g. another app or topic:
     repeat step 2 with three automations that fit it.
   - Free text naming no task, no change, e.g. "skip", "no" or
     "later", or `answered: false`: do not build. On an onboarding thread call
     `leave-onboarding`, then write a one-sentence reply, for example "No
     problem. Explore the app and tell me when you want to automate something."
4. Ask before build. No text, ONE `workflow_builder_ask_user` call with
   `questions` only: `single` question "Nice! Should I build this now?",
   `required: true`, options `Yes, build it` and `Not now`. Leave
   `introMessage` and `freeTextLabel` out: card's own "Something else"
   row lets user ask for other automation. Read answer:
   - `Yes, build it`: step 5.
   - `Not now`: no build, stay in flow. Repeat step 2 with the
     same three automations, after one sentence such as "No problem. Pick
     another one, or ask for other ideas."
   - `answered: false`: no build. Reply as for skip in step 3.
   - Free text: read as in step 3.
5. Exactly one line before first tool call, `Building <title> now.`,
   no other text until `workflow_builder_build_workflow` result. Load `workflow-builder`,
   build automation with user's apps normal way, then follow
   `postBuildFlow.instructions` from result. Ask about app only for
   step user's list doesn't cover, one question per turn.

## Rules

- One `workflow_builder_ask_user` call per turn. Every message four sentences or fewer.
- Build needs `Yes, build it` from user on step 4 card, for
  picked suggestion and for task in user's words alike. Never start one
  after skip, dismissal, or free text naming nothing.
- No apps given: suggest what team people most often automate,
  name no app.
- Talk about automation, never mechanics. Never say
  "validate", "workspace" or file name in message. Say what's being
  built and what user gets, e.g. "Building the reminder now."
- User wants stop onboarding or asks something unrelated:
  drop flow. Onboarding thread: whenever you stop asking card
  questions, call `leave-onboarding` first, then reply. Reply skipping
  questions without that call leaves user stuck in flow.
- Never ask for credentials, keys, passwords in chat.
- Reply in user's language.