import type { RuntimeSkill } from '@n8n/agents';

import { TASK_OBJECTIVE_FORMAT_RULE, TASK_OBJECTIVE_TEMPLATE } from '../task-objective-template';

export function targetTasksSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-tasks',
		name: 'Agent Builder Target Tasks',
		description:
			'Use when the user wants to create or change something the target agent runs on a recurring schedule (a "task"). Not for one-off requests, chat/event triggers, or config/tool/skill/model edits.',
		recommendedTools: [
			'create_tasks',
			'list_tasks',
			'update_task',
			'ask_questions',
			'read_config',
			'patch_config',
			'publish_agent',
		],
		allowedTools: [
			'create_tasks',
			'list_tasks',
			'update_task',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
			'list_workflows',
			'search_nodes',
			'get_node_types',
			'ask_credential',
			'publish_agent',
		],
		instructions: `\
## Purpose

Use this to create recurring scheduled tasks with \`create_tasks\`, discover
them with \`list_tasks\`, and edit their saved bodies with \`update_task\`.
A task = a name + an objective (what the agent does each run) + a cron schedule,
stored as a \`{ type: "task", id, enabled }\` ref in the agent config
(\`config.tasks\`) plus a saved body. The config is the source of truth for
membership and enabled state.

## Use when

- The user wants the agent to do something automatically on a schedule
  ("every morning", "each Monday", "hourly", etc.).
- There is a clear, repeatable objective the agent can carry out unattended.
- The user wants to rename, reschedule, or change the objective of an existing
  scheduled task.

## Don't use when

- The request is a one-off action, a chat/event trigger, or a
  config/tool/skill/model edit.

## Objective format (required)

${TASK_OBJECTIVE_FORMAT_RULE}

${TASK_OBJECTIVE_TEMPLATE}

## Fill the template with assumptions (required)

Do NOT call \`create_tasks\`, or replace an objective with \`update_task\`, until
BOTH of these are true for it:

1. You can fill EVERY section of the objective template above with concrete,
   specific content — no placeholders, nothing left to "refine
   later". The objective must stand on its own from the current builder chat,
   but the target Agent Instructions still apply and its configured Skills
   remain available. Do not repeat universal rules or copy reusable procedures.
   When the user did not specify a detail, derive it from the goal as a stated
   assumption and list it in your summary.
2. The schedule is concrete — how often and at what time it should run. If
   the user did not specify a cadence, pick a sensible default and state it
   as an assumption.

Use \`ask_questions\` only when even a reasonable assumption is impossible —
never during an initial build: mark the task \`blocked\` instead, per the
Initial Build rules in your system prompt. Never create a placeholder or
"refine-it-later" task.

## Workflow

- For an existing task, call \`list_tasks\` to resolve its current id and body.
  Then call \`update_task\` with only the fields the user asked to change. Never
  rewrite the objective for a name-only or schedule-only edit.
- For each new or replacement objective, fill every template section with
  run-specific details. Do not duplicate Agent Instructions or Skill bodies;
  name a configured capability only when it helps route the work.
- Make sure the agent already has every tool the steps need (an integration,
  node/workflow tool, or web search). If something is missing, add it to the agent
  config first — a task can only use tools the agent already has.
- Translate each cadence into a valid 5-field cron expression (e.g. daily 09:00
  -> "0 9 * * *"; weekdays 08:30 -> "30 8 * * 1-5"; hourly -> "0 * * * *").
  Keep this cadence out of the objective; only a data lookback window belongs
  in its Context.
- Set \`timezone\` to the IANA zone whenever the user names a timezone or a
  location ("9am in Tokyo" -> "Asia/Tokyo"); omit it to run on the instance
  timezone.
- Call \`create_tasks\` once with a \`tasks\` array containing every task you
  currently know how to write — do not spread multiple fully-specified tasks
  across separate calls. A single task is still a one-item array.
- On \`{ ok: false, errors }\` (for example an invalid cron), fix the input and
  retry the failed operation. An invalid task rejects the whole
  \`create_tasks\` batch.

## Rules

- Every objective must be self-contained from the builder chat and unambiguous,
  without repeating universal instructions or reusable skill procedures.
- Use a short, descriptive name per task.
- One task = one objective + one schedule. Include multiple tasks in the same
  \`create_tasks\` call for multiple recurring jobs.

## Gotchas

- \`create_tasks\` adds a \`{ type: "task", id, enabled }\` ref per task to
  \`config.tasks\` and creates each task body. Tasks are enabled by default and
  only start running once the agent is (re)published via \`publish_agent\`; tell
  the user this when relevant, and call \`publish_agent\` when they ask to publish
  or make the agent live.
- \`update_task\` preserves the task id and config ref. Its draft changes affect
  scheduled runs after the agent is (re)published.
- To disable or remove a task, edit \`config.tasks\` with \`patch_config\` (set
  \`enabled: false\`, or drop the ref). Changes take effect on the next
  \`publish_agent\`.
- \`create_tasks\` does NOT add tools — if a task needs a tool the agent lacks,
  add it to the config yourself first.
- Do not call \`create_tasks\` once per task when several are ready; batch them
  into one call so the whole set is stored in a single round trip.`,
	};
}
