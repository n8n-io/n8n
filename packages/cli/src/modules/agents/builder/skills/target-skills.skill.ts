import type { RuntimeSkill } from '@n8n/agents';

import {
	SKILL_BODY_FORMAT_RULE,
	SKILL_BODY_TEMPLATE,
	SKILL_DESCRIPTION_RULE,
} from '../skill-body-template';

export function targetSkillsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-skills',
		name: 'Agent Builder Target Skills',
		description:
			'Use when creating reusable target-agent skills, playbooks, policies, style guides, or domain instructions with create_skills that should load only for relevant future requests; not for builder guidance or one-off instructions.',
		recommendedTools: ['create_skills', 'ask_questions', 'read_config', 'patch_config'],
		allowedTools: ['create_skills', 'ask_questions', 'read_config', 'patch_config', 'write_config'],
		instructions: `\
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

${SKILL_DESCRIPTION_RULE}

## Skill body format (required)

${SKILL_BODY_FORMAT_RULE}

${SKILL_BODY_TEMPLATE}

## Fill the template with assumptions (required)

Do NOT call \`create_skills\` until you have enough concrete domain detail to write
a genuinely useful skill: a specific routing description and a body whose
applicable sections are filled with real content (the actual steps, rules,
examples, and edge cases). Derive missing domain detail from the user's
stated goal as stated assumptions, and list them in your summary. Use
\`ask_questions\` only when even a reasonable assumption is impossible — never
during an initial build: mark the task \`blocked\` instead, per the Initial
Build rules in your system prompt. Never create a placeholder or vague
skill.

## Workflow

- Fill the domain detail you need, deriving missing detail from the goal as
  stated assumptions so the description and every applicable body section can
  be written with concrete content, for every skill you plan to create.
- Write each skill's \`description\` as the routing contract and \`instructions\`
  using the template above. Put all "when to use" / "when not to use" guidance
  in the description, never in the body (the body is invisible until the skill
  loads).
- Call \`create_skills\` once with a \`skills\` array containing every skill you
  currently know how to write — do not spread multiple fully-specified skills
  across separate calls. A single skill is still a one-item array.
- \`create_skills\` stores the skill bodies only; it does not attach them. The
  batch is all-or-nothing: an invalid or duplicate-named skill rejects the
  whole call.
- After it returns an id per skill, call \`read_config\`.
- Use \`patch_config\` or \`write_config\` to add a \`{ "type": "skill", "id": "<returned id>" }\`
  entry per skill to \`skills\`.

## Extended fields

- Use \`allowedTools\` only for exact tool names already attached to the target
  agent that this skill may use.
- Add \`references\` for longer markdown-only supporting files under
  \`references/...\`, such as rubrics, examples, policies, templates, or
  checklists. References are not automatically loaded when the skill loads.
  If you add references, the main \`instructions\` must say exactly when to load
  each reference by path.
- Example reference load rules: "Before scoring renewal risk, load
  \`references/risk-rubric.md\`"; "Before drafting negotiation copy, load
  \`references/negotiation-playbook.md\`"; "Before asking intake questions, load
  \`references/intake-checklist.md\`".
- Omit fields you cannot fill confidently. Do not invent tool names or file paths.
- Scripts are not supported in this phase. Do not pass scripts or non-markdown
  linked files to \`create_skills\`.

## Rules

- Write descriptions as intent-oriented "Use when..." guidance with concrete
  triggers, contexts, and boundaries.
- Keep skill bodies narrow, operational, and verifiable.
- Do not rely on a body "Use when" section to trigger the skill; the body is
  not visible until after the skill is selected.
- Include concrete gotchas that prevent predictable target-agent mistakes.
- Do not use \`create_skills\` for builder instructions. These skills belong to the target agent.

## Gotchas

- \`create_skills\` does not attach any skill to the target agent config.
- A skill that is useful for every request probably belongs in instructions, not in \`skills\`.
- A vague description creates a vague skill, even if the body is excellent.
- Do not create placeholder or vague skills; derive missing domain details from
  the stated goal as assumptions instead.
- Do not call \`create_skills\` once per skill when several are ready — batch them
  into one call so the whole set is stored in a single round trip.

## Verify

- Every returned skill id is attached in config as a \`{ "type": "skill", "id": "<returned id>" }\`
  entry.
- Each skill description clearly states when it should load.
- Each body follows the template, with each applicable section filled with
  concrete content (no placeholders), and tells the target agent what to do when
  the skill is loaded.`,
	};
}
