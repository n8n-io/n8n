/**
 * Canonical structure every generated task objective must follow.
 *
 * Synthesised from the structured prompt frameworks that converge in current
 * practice — RISEN (Role, Instructions, Steps, Expectation, Narrowing), CO-STAR /
 * "R-TCC-COE" (Role, Task, Context, Content, Constraints, Output, Evaluation) and
 * intent-engineering — and adapted for an unattended, scheduled agent run: the
 * objective is the ONLY message the agent receives when the task fires, so it must
 * be fully self-contained and must say where the result is delivered (nobody is
 * watching the run).
 *
 * Shared by the `create_task` builder tool, the `agent-builder-target-tasks`
 * skill, and the builder prompt so the guidance is identical everywhere.
 */
export const TASK_OBJECTIVE_TEMPLATE = `## Objective
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
<A verifiable definition of done for a single run.>`;

/** One-line rule that introduces the template wherever it is shown to the model. */
export const TASK_OBJECTIVE_FORMAT_RULE =
	'The objective is the only message the agent receives on each unattended run, so it must be ' +
	'fully self-contained (never rely on the current chat) and must follow this exact Markdown ' +
	'structure, with every section filled in with concrete, specific content — no placeholders or ' +
	'angle-bracket text:';

/** The rule followed by the template, for embedding in tool / field descriptions. */
export const TASK_OBJECTIVE_GUIDANCE = `${TASK_OBJECTIVE_FORMAT_RULE}\n\n${TASK_OBJECTIVE_TEMPLATE}`;
