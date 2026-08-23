/**
 * Canonical structure every generated task objective must follow.
 *
 * Synthesised from the structured prompt frameworks that converge in current
 * practice — RISEN (Role, Instructions, Steps, Expectation, Narrowing), CO-STAR /
 * "R-TCC-COE" (Role, Task, Context, Content, Constraints, Output, Evaluation) and
 * intent-engineering — and adapted for an unattended, scheduled agent run. The
 * objective supplies run-specific context beneath the target-agent instructions,
 * and must say where the result is delivered because nobody is watching the run.
 *
 * Shared by the `create_tasks` builder tool, the `agent-builder-target-tasks`
 * skill, and the builder prompt so the guidance is identical everywhere.
 */
export const TASK_OBJECTIVE_TEMPLATE = `## Objective
<One sentence: the run-specific outcome to achieve and why it matters. Do not repeat the agent's overall purpose.>

## Context
<Run-specific inputs, data sources, and data lookback window, such as "items created since the previous run". Do not state when the task runs; its cadence belongs only in cronExpression.>

## Steps
1. <First task-specific action or configured skill/capability to use.>
2. <Next task-specific action. Do not copy reusable procedures from Agent Instructions or Skills.>

## Output
<The exact format of the result AND where to deliver it (e.g. "email a summary to ops@example.com", "post to Slack #alerts", "append a row to the tracking sheet"). The run is unattended, so the agent must actively deliver the result somewhere.>

## Constraints
<Task-specific scope limits, what to avoid, and what to do when there is nothing to act on, such as "if there are no new items, do nothing".>

## Success criteria
<A verifiable definition of done for a single run.>`;

/** One-line rule that introduces the template wherever it is shown to the model. */
export const TASK_OBJECTIVE_FORMAT_RULE =
	'The objective is the run-specific user message for each unattended run. Agent Instructions ' +
	'still apply and configured Skills remain available, so do not repeat universal rules or copy ' +
	'reusable procedures into the objective. The schedule is separate metadata in cronExpression and ' +
	'must never be repeated in the objective. It must be self-contained from the current builder ' +
	'chat and follow this exact Markdown structure, with every section filled in with concrete, ' +
	'specific content — no placeholders or angle-bracket text:';

/** The rule followed by the template, for embedding in tool / field descriptions. */
export const TASK_OBJECTIVE_GUIDANCE = `${TASK_OBJECTIVE_FORMAT_RULE}\n\n${TASK_OBJECTIVE_TEMPLATE}`;
