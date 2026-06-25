/**
 * Canonical structure for an agent skill: a routing `description` plus a
 * load-on-demand `body`.
 *
 * Synthesised from the Agent Skills / SKILL.md conventions that have become
 * standard practice (Anthropic's skill-authoring guidance, the Microsoft Agent
 * Framework, and the broader progressive-disclosure pattern): the description is
 * the only text the runtime sees when deciding whether to load the skill, so it
 * carries the triggers; the body is loaded on demand and must read as a compact,
 * self-contained, actionable operating manual.
 *
 * Shared by the `create_skill` builder tool, the `agent-builder-target-skills`
 * skill, and the builder prompt so the guidance is identical everywhere.
 */

/** How to write the `description` (the routing contract). */
export const SKILL_DESCRIPTION_RULE =
	'The description is the routing contract — the only text the agent sees when deciding whether ' +
	'to load this skill, so it must be specific: state what the skill does AND the concrete ' +
	'situations or keywords that should trigger it (e.g. "Use when the user asks to …"), plus when ' +
	'NOT to use it where helpful. A vague description means the skill never loads.';

/** Rule that introduces the body template wherever it is shown to the model. */
export const SKILL_BODY_FORMAT_RULE =
	'The body is loaded only after the skill triggers, so it must be a self-contained, actionable ' +
	'operating manual. Follow this exact Markdown structure, filling each applicable section with ' +
	'concrete, specific content — no placeholders or angle-bracket text. Do NOT put "when to use" ' +
	'triggers here; those belong in the description:';

export const SKILL_BODY_TEMPLATE = `## Overview
<1-2 sentences: what the agent should do when this skill is loaded, and the outcome it produces.>

## Inputs
<What the agent needs before starting — required inputs, tools, credentials, or context — and how to obtain them. Write "None" if there are no prerequisites.>

## Steps
1. <First action — specific and actionable.>
2. <Next action.>

## Rules
- <A constraint or guideline the agent must always follow.>

## Example
<A concrete, representative example: the input and the expected output or result.>

## Gotchas
<Common mistakes or edge cases, and how to handle them.>`;

/** The body rule followed by the template, for embedding in tool / field descriptions. */
export const SKILL_BODY_GUIDANCE = `${SKILL_BODY_FORMAT_RULE}\n\n${SKILL_BODY_TEMPLATE}`;
