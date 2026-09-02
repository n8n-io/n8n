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
			'Use when designing, creating, or editing target-agent behavior that belongs in focused load-on-demand skills, including when the user describes a function without calling it a skill; not for builder guidance or universal target-agent instructions.',
		recommendedTools: [
			'list_skills',
			'read_skill',
			'update_skill',
			'create_skills',
			'ask_questions',
			'read_config',
			'patch_config',
		],
		allowedTools: [
			'list_skills',
			'read_skill',
			'update_skill',
			'create_skills',
			'ask_questions',
			'read_config',
			'patch_config',
			'write_config',
		],
		instructions: `\
## Purpose

Use this to design, create, and edit focused load-on-demand instructions for
the target agent. Keep the target agent's always-on instructions limited to its
identity, overall purpose, and rules that apply to every operation.

## Use when

- The target agent has a distinct function, workflow, playbook, policy, style
  guide, or domain behavior that should load only for relevant requests.
- The user asks to change how the target agent performs an existing function,
  even when they do not mention skills.
- A build contains multiple functions. Create one focused skill per function;
  infer this decomposition without asking the user to label anything a skill.

## Don't use when:

- The behavior is the target agent's identity, overall purpose, or a rule that
  truly applies to every operation; keep that in the main instructions.
- The request changes only a tool, integration, model, or memory setting and
  does not add or change how the target agent performs a function.

## Description (routing contract)

${SKILL_DESCRIPTION_RULE}

## Skill body format (required)

${SKILL_BODY_FORMAT_RULE}

${SKILL_BODY_TEMPLATE}

## Fill the template with assumptions (required)

Do NOT create or update a skill until you have enough concrete domain detail to
write a genuinely useful skill: a specific routing description and a body whose
applicable sections are filled with real content (the actual steps, rules,
examples, and edge cases). Derive missing domain detail from the user's
stated goal as stated assumptions, and list them in your summary. Use
\`ask_questions\` only when even a reasonable assumption is impossible — never
during an initial build: mark the task \`blocked\` instead, per the Initial
Build rules in your system prompt. Never create a placeholder or vague
skill.

## Workflow

- Classify requested behavior before writing: identity, overall purpose, and
  universal rules stay in main instructions; each distinct or conditional
  function becomes a focused skill.
- Call \`read_config\` and use its \`skills\` refs as the authoritative set of
  skills attached to the target agent.
- Call \`list_skills\` once and compare its metadata with the attached ids from
  the config. Use each description as the routing contract to identify whether
  an attached skill already owns the capability. Do not read every skill body.
- Call \`read_skill\` only for the relevant attached skill. Its default response
  includes reference paths and sizes but omits reference content; request
  specific \`referencePaths\` only when that content is needed.
- Call \`update_skill\` for an existing capability, changing only the supplied
  fields and preserving its id and existing config reference. Do not create a
  replacement skill. Pass \`null\` for \`allowedTools\` to remove the tool
  restriction or for \`references\` to remove all references; do not pass empty
  arrays. When replacing \`references\`, first read the content of every existing
  reference that must be preserved, because the field is replaced as a whole.
- Only call \`create_skills\` when no attached skill owns the capability. Fill the
  domain detail you need, deriving missing detail from the goal as stated
  assumptions so each description and applicable body section is concrete.
- Write each skill's \`description\` as the routing contract and \`instructions\`
  using the template above. Put all "when to use" / "when not to use" guidance
  in the description, never in the body (the body is invisible until the skill
  loads).
- For new skills, call \`create_skills\` once with a \`skills\` array containing every skill you
  currently know how to write — do not spread multiple fully-specified skills
  across separate calls. A single skill is still a one-item array.
- \`create_skills\` stores the skill bodies only; it does not attach them. The
  batch is all-or-nothing: an invalid or duplicate-named skill rejects the
  whole call.
- After it returns an id per new skill, call \`read_config\` again for a fresh
  config and hash.
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
  linked files to \`create_skills\` or \`update_skill\`.

## Rules

- Write descriptions as intent-oriented "Use when..." guidance with concrete
  triggers, contexts, and boundaries.
- Keep skill bodies narrow, operational, and verifiable.
- Do not rely on a body "Use when" section to trigger the skill; the body is
  not visible until after the skill is selected.
- Include concrete gotchas that prevent predictable target-agent mistakes.
- Do not use target-agent skill tools for builder instructions. These skills
  belong to the target agent.

## Gotchas

- \`create_skills\` does not attach any skill to the target agent config.
- \`update_skill\` edits the existing body in place and needs no config patch.
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
