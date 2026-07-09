---
name: intent-recognition
description: >-
  Classifies automation requests by control-flow ownership: deterministic
  workflow, bounded LLM judgment inside a workflow, full agent, single AI task,
  or ambiguous request. Must be used before deciding the intent of any
  automation request, including intent-only classification, route selection,
  workflow-vs-agent decisions, hybrid-vs-agent distinctions, and ambiguous
  automation requests, before choosing workflow-builder, planning, or an
  agent-oriented design.
---

# Intent recognition

## Purpose

Use this skill to classify an automation request before designing or building
it. This skill must be used before deciding whether a request is a workflow,
hybrid workflow, full agent, single AI task, or ambiguous. The deciding question
is who owns control flow: predefined workflow code, one bounded LLM judgment, or
an LLM tool-use loop.

If the user asked to build, use the classification to choose the next path:
workflow-builder for workflow or hybrid workflows, a plain AI node for single
AI tasks, an agent design for true tool-use loops, or `ask-user` for ambiguous
requests.

## Inputs

- The user's request or scenario prompt.
- Any explicit constraints about determinism, auditability, latency, cost,
  compliance, or allowed tools.
- If the request is underspecified, ask for the missing control-flow details
  instead of guessing.

## Labels

1. **Workflow**: The prompt determines the control flow. The steps, branches,
   inputs, and outputs can be drawn as a flowchart before runtime.
2. **Hybrid**: The prompt needs one bounded LLM judgment, classification,
   extraction, score, or moderation result, and fixed workflow steps act on that
   result.
3. **Agent**: The prompt gives a goal but the path must be discovered at runtime
   through an LLM autonomously using tools in a loop.
4. **Single AI task**: The request is just a bounded model call, such as
   summarizing, translating, rewriting, extracting, or drafting text, and does
   not need workflow orchestration or a tool loop.
5. **Ambiguous**: The request does not specify enough mechanism to choose
   confidently. Ask a clarifying question.

## Decision Steps

1. Identify whether the prompt specifies steps or only an outcome.
2. If the steps are specified or enumerable, prefer **workflow**, even when the
   workflow is long or contains AI.
3. If the request has a bounded judgment whose output feeds fixed branches,
   choose **hybrid**, not agent.
4. If each next action depends on interpreting previous tool results and the
   path cannot be enumerated up front, choose **agent**.
5. If the request is only one AI transformation with no orchestration need,
   choose **single AI task**.
6. If both a deterministic and agentic interpretation are plausible, choose
   **ambiguous** and ask what rules, judgment, or actions should apply.
7. Bias ties toward the simpler label. Unnecessary agency adds latency, cost,
   and compounding error risk.

## Signals

**Workflow signals**:

- "when X happens, do Y"
- schedules such as "every day", "every morning", or "hourly"
- fixed source-to-destination syncs
- named apps and fully ordered "and then" chains
- enumerable `if` / `else` or switch conditions
- requirements for reproducibility, auditability, same output every time,
  logging, recording, or notification

**Hybrid signals**:

- "classify and route"
- "score then assign"
- "triage"
- "moderate"
- "prioritize and dispatch"
- sentiment, urgency, topic, toxicity, spam, or lead-quality judgments followed
  by fixed downstream actions

**Agent signals**:

- "figure out"
- "decide"
- "handle whatever comes in"
- "as needed"
- "based on context"
- open-ended research or investigation
- a goal where each tool result determines what to do next
- rules so numerous or shifting that a hardcoded branch tree would be
  unmaintainable

**Ambiguous signals**:

- vague goals like "handle my inbox" or "notify me about important emails"
- mixed requests where one part is bounded but another part implies unspecified
  follow-up actions
- adjectives like "important", "urgent", or "interesting" without rules or
  examples

## Examples

- "Every morning at 9am, pull yesterday's Stripe charges and append them to a
  Google Sheet." -> **workflow**: fixed schedule, fixed source, fixed
  destination.
- "When a form is submitted, create a HubSpot contact, send a welcome email, add
  them to a list, and post to Slack." -> **workflow**: multi-step does not mean
  agent when every step is specified.
- "Whenever a new article hits our RSS feed, summarize it in two sentences and
  post the summary to LinkedIn." -> **workflow** with a bounded LLM step: AI
  inside a fixed pipeline is not an agent.
- "Read incoming support emails, classify by urgency and topic, then route
  urgent billing to finance and technical issues to PagerDuty." -> **hybrid**:
  bounded classification plus deterministic routing.
- "Check comments for toxicity and spam; auto-publish clean ones, queue flagged
  ones for review." -> **hybrid**: model judgment feeds two fixed paths.
- "Research our competitors' recent pricing changes and summarize what changed."
  -> **agent**: search, reading, follow-up investigation, and synthesis are
  discovered at runtime.
- "When a customer complains, figure out what went wrong by checking orders and
  past tickets, then decide whether to refund, replace, or escalate." ->
  **agent**: investigation order depends on lookup results.
- "Summarize this product announcement and translate it into German." ->
  **single AI task**: no workflow orchestration or autonomous tool loop is
  needed.
- "Help me handle my inbox." -> **ambiguous**: ask whether the user wants
  deterministic rules or autonomous triage.

## Gotchas

- Do not label a request as agent just because it is long, multi-step, or
  mentions AI.
- Do not label classify-then-route as agent unless the model repeatedly decides
  the next action after observing prior results.
- Do not force vague prompts into a label. Ask a clarifying question when the
  control flow cannot be inferred.
- Do not use an agent when progress cannot be verified. If the path cannot be
  scripted and the result cannot be checked, the design is not ready.
- Keep n8n framing clear: agents operate inside workflow guardrails; they do not
  replace the workflow engine.

## Output Format

Return a concise classification and reason:

```text
Label: workflow | hybrid | agent | single-ai-task | ambiguous
Reason: <one or two sentences about control flow, judgment, and whether a tool-use loop is needed>
Next step: <build workflow / use bounded AI step / build agent / use AI node / ask clarification>
```

For build requests, do not expose this format unless the user asks for
classification. Instead, proceed according to the selected next step.
