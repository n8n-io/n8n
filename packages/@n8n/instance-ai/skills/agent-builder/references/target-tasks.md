
## Purpose

Use this to create a recurring scheduled task for the target agent with
`create_task`. A task = a name + an objective (what the agent does each run) + a
cron schedule, stored as a `{ type: "task", id, enabled }` ref in the agent
config (`config.tasks`) plus a saved body. The config is the source of truth.

## Use when

- The user wants the agent to do something automatically on a schedule
  ("every morning", "each Monday", "hourly", etc.).
- There is a clear, repeatable objective the agent can carry out unattended.

## Don't use when

- The request is a one-off action, a chat/event trigger, or a
  config/tool/skill/model edit.

## Objective format (required)

The objective is the only message the agent receives on each unattended run, so it must be fully self-contained (never rely on the current chat) and must follow this exact Markdown structure, with every section filled in with concrete, specific content — no placeholders or angle-bracket text:

## Objective
<One sentence: the outcome to achieve on each run and why it matters.>

## Context
<Background the agent needs, the inputs and data sources to use, and the time window to consider (e.g. "items created since the previous run").>

## Steps
1. <First action.>
2. <Next action.>

## Output
<The exact format of the result AND where to deliver it (e.g. "email a summary to ops@example.com", "post to Slack #alerts", "append a row to the tracking sheet"). The run is unattended, so the agent must actively deliver the result somewhere.>

## Constraints
<Scope limits, what to avoid, and what to do when there is nothing to act on (e.g. "if there are no new items, do nothing").>

## Success criteria
<A verifiable definition of done for a single run.>

## Ask first (required)

Do NOT call the `create_task` action until BOTH of these are true:

1. You can fill EVERY section of the objective template above with concrete,
   specific content — no placeholders, no guesses, nothing left to "refine
   later". The objective is the ONLY message the agent receives when the task
   fires, so it must stand on its own and must not rely on the current chat.
2. The schedule is concrete — how often and at what time it should run.

If any section would be empty or a guess, ask the user clarifying questions with
the `ask-user` tool until you can complete the whole template and pin down the
cadence. Never create a placeholder or "refine-it-later" task.

## Workflow

- Gather everything the template needs (every objective section + the cadence),
  asking clarifying questions until no section is a guess.
- Write the objective using the exact template above, filling each section.
- Make sure the agent already has every tool the steps need (an integration,
  node/workflow tool, or web search). If something is missing, add it to the agent
  config first — a task can only use tools the agent already has.
- Translate the cadence into a valid 5-field cron expression (e.g. daily 09:00
  -> "0 9 * * *"; weekdays 08:30 -> "30 8 * * 1-5"; hourly -> "0 * * * *").
- Call `agent_builder` (`action: "create_task"`) with `name`, `objective`, and
  `cronExpression`.
- On `{ ok: false, errors }` (for example an invalid cron), fix the input and
  retry.

## Rules

- The objective must be self-contained and unambiguous.
- Use a short, descriptive task name.
- One task = one objective + one schedule. Create multiple tasks for multiple
  recurring jobs.

## Gotchas

- `create_task` adds a `{ type: "task", id, enabled }` ref to `config.tasks` and
  creates the task body. The task is enabled by default and only starts running
  once the agent is (re)published; tell the user this when relevant.
- To disable or remove a task, edit `config.tasks` in the config file (set
  `enabled: false`, or drop the ref) and persist with `agent_builder`
  (`action: "build_agent"`). Changes take effect on the next publish.
- `create_task` does NOT add tools — if the task needs a tool the agent lacks,
  add it to the config yourself first.
