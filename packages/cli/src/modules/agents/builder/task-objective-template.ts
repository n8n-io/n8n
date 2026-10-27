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
 * The `agent-builder-target-tasks` skill shows it. The builder tools check a saved
 * objective against it after the save, so the always-loaded tool schemas stay small.
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

/** The section headings of the template, in order. */
export const TASK_OBJECTIVE_SECTIONS = [...TASK_OBJECTIVE_TEMPLATE.matchAll(/^## (.+)$/gm)].map(
	(match) => match[1],
);

type ObjectiveSection = { heading: string; body: string };

/** Splits an objective into `## ` sections. A heading line may end with a colon. */
function parseSections(objective: string): ObjectiveSection[] {
	const parts = objective.split(/^##[ \t]+(.+?)[ \t:]*$/m);
	const sections: ObjectiveSection[] = [];
	for (let i = 1; i < parts.length; i += 2) {
		sections.push({ heading: parts[i].toLowerCase(), body: parts[i + 1].trim() });
	}
	return sections;
}

function sectionGap(section: string, found: ObjectiveSection | undefined): string | undefined {
	if (!found) return `${section} missing`;
	if (!found.body) return `${section} empty`;
	if (/<[^<>\n]+>/.test(found.body)) return `${section} has placeholder text`;
	return undefined;
}

/** How an objective departs from the template: missing, empty, or placeholder sections, and order. */
export function objectiveTemplateGaps(objective: string): string[] {
	const sections = parseSections(objective);
	const gaps = TASK_OBJECTIVE_SECTIONS.flatMap((section) => {
		const gap = sectionGap(
			section,
			sections.find((s) => s.heading === section.toLowerCase()),
		);
		return gap ? [gap] : [];
	});
	const order = sections
		.map(({ heading }) => TASK_OBJECTIVE_SECTIONS.findIndex((s) => s.toLowerCase() === heading))
		.filter((index) => index >= 0);
	if (order.some((index, i) => i > 0 && index < order[i - 1])) gaps.push('sections out of order');
	return gaps;
}
