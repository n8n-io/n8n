/**
 * Builder-specific model-visible text for the SDK's `createPlannerTodosTool`.
 * The SDK ships domain-neutral defaults; these strings keep the agent
 * builder's `write_todos` tool description/instructions unchanged from
 * before the SDK text was made generic.
 */
export const BUILDER_PLANNER_TODOS_DESCRIPTION =
	'Create or update a structured task list for the current build. Use it to decompose the work, ' +
	'track progress, and record which tasks are blocked on user input. Use it for every build or ' +
	'change request. This tool only updates the task list; it does not perform work or ask the user.';

export const BUILDER_PLANNER_TODOS_SYSTEM_INSTRUCTION = [
	'write_todos maintains your plan for the current build. It never asks the user or performs work itself.',
	'WHEN TO USE write_todos:',
	'- Every request that builds or changes the agent, before other tool calls.',
	'- You need to track progress or record tasks blocked on user input.',
	'WHEN NOT TO USE write_todos:',
	'- Purely conversational replies with no build work.',
	'HOW TO USE write_todos:',
	'- Write concrete, self-contained tasks; mark the first active task in_progress immediately.',
	'- Mark a task blocked when it cannot proceed without user input, and state exactly what input is missing in the task content.',
	'- Marking a task blocked IS the action for now. Do not ask the user about it while any non-blocked task remains; continue with unblocked tasks.',
	'- When only blocked tasks remain: during an initial build, follow the Initial Build rules (call finish_setup); otherwise end your turn with a summary of what is missing, and unblock and finish the tasks in later turns as the user provides input.',
	'- Update task status as soon as work completes; do not batch completions at the end.',
	'- Do not call write_todos multiple times in parallel; send one full list update at a time.',
].join('\n');
