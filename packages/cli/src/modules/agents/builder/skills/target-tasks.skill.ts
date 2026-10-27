import type { RuntimeSkill } from '@n8n/agents';

import { TASK_OBJECTIVE_FORMAT_RULE, TASK_OBJECTIVE_TEMPLATE } from '../task-objective-template';

export function targetTasksSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-tasks',
		name: 'Agent Builder Target Tasks',
		description:
			'Use when user wants to create or change something target agent runs on recurring schedule (a "task"). Not for one-off requests, chat/event triggers, or config/tool/skill/model edits.',
		recommendedTools: [
			'agent_builder_create_tasks',
			'agent-context',
			'agent_builder_update_task',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_publish_agent',
		],
		allowedTools: [
			'agent_builder_create_tasks',
			'agent-context',
			'agent_builder_update_task',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_write_config',
			'search_nodes',
			'get_node_types',
			'setup_credentials',
			'agent_builder_publish_agent',
		],
		instructions: `\
## Purpose

Create recurring scheduled tasks with \`agent_builder_create_tasks\`, discover
them with \`agent-context({ type: "tasks" })\`, and edit their saved bodies with \`agent_builder_update_task\`.
A task = name + objective (what agent does each run) + cron schedule,
stored as \`{ type: "task", id, enabled }\` ref in agent config
(\`config.tasks\`) plus saved body. Config is source of truth for
membership and enabled state.

## Use when

- User wants agent to do something automatically on schedule
  ("every morning", "each Monday", "hourly", etc.).
- Clear, repeatable objective agent can carry out unattended.
- User wants to rename, reschedule, or change objective of existing
  scheduled task.

## Don't use when

- Request is one-off action, chat/event trigger, or
  config/tool/skill/model edit.

## Objective format (required)

${TASK_OBJECTIVE_FORMAT_RULE}

${TASK_OBJECTIVE_TEMPLATE}

## Fill the template with assumptions (required)

Do NOT call \`agent_builder_create_tasks\`, or replace objective with \`agent_builder_update_task\`, until
BOTH of these are true for it:

1. You can fill EVERY section of objective template above with concrete,
   specific content — no placeholders, nothing left to "refine
   later". Objective must stand on its own from current builder chat,
   but target Agent Instructions still apply and its configured Skills
   remain available. Do not repeat universal rules or copy reusable procedures.
   When user did not specify detail, derive it from goal as stated
   assumption and list it in your summary.
2. Schedule is concrete — how often and at what time it should run. If
   user did not specify cadence, pick sensible default and state it
   as assumption.

Use \`agent_builder_ask_questions\` only when even reasonable assumption is impossible —
never during initial build: add open decision to pending setup
instead, per Initial Build rules in \`agent-builder\` skill. Never create
placeholder or "refine-it-later" task.

## Workflow

- For existing task, call \`agent-context({ type: "tasks" })\` to resolve its current id and body.
  Then call \`agent_builder_update_task\` with only fields user asked to change. Never
  rewrite objective for name-only or schedule-only edit.
- For each new or replacement objective, fill every template section with
  run-specific details. Do not duplicate Agent Instructions or Skill bodies;
  name configured capability only when it helps route work.
- Agent must already have every capability steps need (integration,
  node/workflow tool, or web search). Configured chat integrations
  automatically generate their context and action tools in scheduled runs too.
  If task sends through configured platform and integration lists
  needed action (for example \`send_dm\`), use that action; do not add
  same-platform node, MCP, or workflow tool. Add tool only when exact
  operation is not supplied by existing integration.
- Translate each cadence into valid 5-field cron expression (e.g. daily 09:00
  -> "0 9 * * *"; weekdays 08:30 -> "30 8 * * 1-5"; hourly -> "0 * * * *").
  Keep this cadence out of objective; only data lookback window belongs
  in its Context.
- Set \`timezone\` to IANA zone whenever user names timezone or
  location ("9am in Tokyo" -> "Asia/Tokyo"); omit it to run on instance
  timezone.
- Call \`agent_builder_create_tasks\` once with \`tasks\` array containing every task you
  currently know how to write — do not spread multiple fully-specified tasks
  across separate calls. Single task is still one-item array.
- On \`{ ok: false, errors }\` (for example invalid cron), fix input and
  retry failed operation. Invalid task rejects whole
  \`agent_builder_create_tasks\` batch.

## Rules

- Every objective must be self-contained from builder chat and unambiguous,
  without repeating universal instructions or reusable skill procedures.
- Use short, descriptive name per task.
- One task = one objective + one schedule. Include multiple tasks in same
  \`agent_builder_create_tasks\` call for multiple recurring jobs.

## Gotchas

- \`agent_builder_create_tasks\` adds \`{ type: "task", id, enabled }\` ref per task to
  \`config.tasks\` and creates each task body. Tasks are enabled by default and
  only start running once agent is (re)published via \`agent_builder_publish_agent\`; tell
  user this when relevant, and call \`agent_builder_publish_agent\` when they ask to publish
  or make agent live.
- \`agent_builder_update_task\` preserves task id and config ref. Its draft changes affect
  scheduled runs after agent is (re)published.
- To disable or remove task, edit \`config.tasks\` with \`agent_builder_patch_config\` (set
  \`enabled: false\`, or drop ref). Changes take effect on next
  \`agent_builder_publish_agent\`.
- \`agent_builder_create_tasks\` does not add config tools. This does not mean scheduled
  message needs messaging node: configured integrations supply their generated
  action tools at runtime even when task has no inbound conversation.
- Proactive or scheduled send through connected chat platform is not
  separate backend integration. Use channel's \`send_dm\` or
  \`send_channel_message\` action when available.
- Never claim task requires same-platform messaging node solely because
  it starts without inbound conversation. If such redundant tool already
  exists and integration covers its action, remove it.
- Do not call \`agent_builder_create_tasks\` once per task when several are ready; batch them
  into one call so whole set is stored in single round trip.`,
	};
}
