
## Purpose

Use this to create reusable load-on-demand instructions for the target agent.

## Use when

- The user wants reusable target-agent guidance (for example playbooks,
  policies, or domain instructions) that should load only for relevant future
  requests.
- The same behavior is likely to be reused across multiple future tasks and
  should be captured as a target-agent skill.
- You want conditional, load-on-demand behavior instead of always-on target
  agent instructions.

## Don't use when:

- The user asks for one-off target-agent instructions or config/tool/integration/model/memory edits.

## Description (routing contract)

The description is the routing contract — the only text the agent sees when deciding whether to load this skill, so it must be specific: state what the skill does AND the concrete situations or keywords that should trigger it (e.g. "Use when the user asks to …"), plus when NOT to use it where helpful. A vague description means the skill never loads.

## Skill body format (required)

The body is loaded only after the skill triggers, so it must be a self-contained, actionable operating manual. Follow this exact Markdown structure, filling each applicable section with concrete, specific content — no placeholders or angle-bracket text. Do NOT put "when to use" triggers here; those belong in the description:

## Overview
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
<Common mistakes or edge cases, and how to handle them.>

## Ask first (required)

Do NOT call the `create_skill` action until you have enough concrete domain
detail to write a genuinely useful skill: a specific routing description and a body whose
applicable sections are filled with real content (the actual steps, rules,
examples, and edge cases). If any of that is missing, ask the user clarifying
questions with the `ask-user` tool until you can write it. Never create a
placeholder or vague skill.

## Workflow

- Gather the domain detail you need, asking clarifying questions until the
  description and every applicable body section can be written with concrete
  content.
- Write the `description` as the routing contract and the `body` using the
  template above. Put all "when to use" / "when not to use" guidance in the
  description, never in the body (the body is invisible until the skill loads).
- Call `agent_builder` (`action: "create_skill"`) with `name`, `description`, and `body`.
- The `create_skill` action stores the body only; it does not attach the skill.
- After it returns an id, follow the config editing flow in SKILL.md: `read_config`,
  add `{ "type": "skill", "id": "<returned id>" }` to `skills` in the config file,
  then `agent_builder` (`action: "build_agent"`).

## Rules

- Write descriptions as intent-oriented "Use when..." guidance with concrete
  triggers, contexts, and boundaries.
- Keep skill bodies narrow, operational, and verifiable.
- Do not rely on a body "Use when" section to trigger the skill; the body is
  not visible until after the skill is selected.
- Include concrete gotchas that prevent predictable target-agent mistakes.
- Do not use `create_skill` for builder instructions. These skills belong to the target agent.

## Gotchas

- `create_skill` does not attach the skill to the target agent config.
- A skill that is useful for every request probably belongs in instructions, not in `skills`.
- A vague description creates a vague skill, even if the body is excellent.
- Do not create placeholder or vague skills; ask for missing domain details first.

## Verify

- The returned skill id is attached in config as `{ "type": "skill", "id": "<returned id>" }`.
- The skill description clearly states when it should load.
- The body follows the template, with each applicable section filled with
  concrete content (no placeholders), and tells the target agent what to do when
  the skill is loaded.
