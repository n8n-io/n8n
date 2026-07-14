import type { RuntimeSkill } from '@n8n/agents';

import { TASK_OBJECTIVE_FORMAT_RULE, TASK_OBJECTIVE_TEMPLATE } from '../task-objective-template';

export function targetTasksSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-tasks',
		name: 'Agent Builder Target Tasks',
		description:
			'Use when the user wants the target agent to run something on a recurring schedule (a "task"): a daily/weekly/hourly objective the agent carries out on its own with create_task. Not for one-off requests, chat/event triggers, or config/tool/skill/model edits.',
		recommendedTools: ['create_task', 'ask_questions', 'read_config', 'patch_config'],
		allowedTools: [
			'create_task',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'list_workflows',
			'search_nodes',
			'get_node_types',
			'ask_credential',
		],
		instructions: `\
## Purpose

Use this to create a recurring scheduled task for the target agent with
\`create_task\`. A task = a name + an objective (what the agent does each run) + a
cron schedule, stored as a \`{ type: "task", id, enabled }\` ref in the agent
config (\`config.tasks\`) plus a saved body. The config is the source of truth.

## Use when

- The user wants the agent to do something automatically on a schedule
  ("every morning", "each Monday", "hourly", etc.).
- There is a clear, repeatable objective the agent can carry out unattended.

## Don't use when

- The request is a one-off action, a chat/event trigger, or a
  config/tool/skill/model edit.

## Objective format (required)

${TASK_OBJECTIVE_FORMAT_RULE}

${TASK_OBJECTIVE_TEMPLATE}

## Ask first (required)

Do NOT call \`create_task\` until BOTH of these are true:

1. You can fill EVERY section of the objective template above with concrete,
   specific content — no placeholders, no guesses, nothing left to "refine
   later". The objective is the ONLY message the agent receives when the task
   fires, so it must stand on its own and must not rely on the current chat.
2. The schedule is concrete — how often and at what time it should run.

If any section would be empty or a guess, ask the user clarifying questions (use
\`ask_questions\`, batching multiple questions into one call — discrete options for
choices, or \`type: "text"\` for open-ended) until you can complete the whole
template and pin down the cadence. Never create a placeholder or "refine-it-later" task.

## Workflow

- Gather everything the template needs (every objective section + the cadence),
  asking clarifying questions until no section is a guess.
- Write the objective using the exact template above, filling each section.
- Make sure the agent already has every tool the steps need (an integration,
  node/workflow tool, or web search). If something is missing, add it to the agent
  config first — a task can only use tools the agent already has.
- Translate the cadence into a valid 5-field cron expression (e.g. daily 09:00
  -> "0 9 * * *"; weekdays 08:30 -> "30 8 * * 1-5"; hourly -> "0 * * * *").
- Call \`create_task\` with \`name\`, \`objective\`, and \`cronExpression\`.
- On \`{ ok: false, errors }\` (for example an invalid cron), fix the input and
  retry.

## Rules

- The objective must be self-contained and unambiguous.
- Use a short, descriptive task name.
- One task = one objective + one schedule. Create multiple tasks for multiple
  recurring jobs.

## Gotchas

- \`create_task\` adds a \`{ type: "task", id, enabled }\` ref to \`config.tasks\` and
  creates the task body. The task is enabled by default and only starts running
  once the agent is (re)published; tell the user this when relevant.
- To disable or remove a task, edit \`config.tasks\` with \`patch_config\` (set
  \`enabled: false\`, or drop the ref). Changes take effect on the next publish.
- \`create_task\` does NOT add tools — if the task needs a tool the agent lacks,
  add it to the config yourself first.`,
	};
}
