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
			'Use when creating or editing target-agent skills: user asks for skills, agent has two or more separate jobs with their own procedures, or existing skill needs change; not for an agent with one job, builder guidance, or universal target-agent instructions.',
		recommendedTools: [
			'agent-context',
			'agent_builder_update_skill',
			'agent_builder_create_skills',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
		],
		allowedTools: [
			'agent-context',
			'agent_builder_update_skill',
			'agent_builder_create_skills',
			'agent_builder_ask_questions',
			'agent_builder_patch_config',
			'agent_builder_write_config',
		],
		instructions: `\
## Purpose

Create and edit load-on-demand instructions for target agent. By default,
target agent's behavior lives in its main instructions. Skills are for agents
whose jobs are too separate or too long to share one set of instructions.

## Use when

- User asks for skills.
- Target agent has two or more separate jobs with their own procedures, for
  example creating tickets, reviewing images, and generating reports. Create
  one skill per job; infer this split without asking user to label anything a
  skill.
- Target agent has two or more jobs, and one job's procedure is long or
  conditional enough to bury general rules in main instructions.
- User asks to change how target agent performs function that attached skill
  already owns.

## Don't use when:

- Target agent has one job. Put its rules and steps in main instructions, even
  when they run to several paragraphs.
- Behavior is target agent's identity, overall purpose, or rule that truly
  applies to every operation; keep that in main instructions.
- Request changes only tool, integration, model, or memory setting and does not
  add or change how target agent performs function.

## Description (routing contract)

${SKILL_DESCRIPTION_RULE}

## Skill body format (required)

${SKILL_BODY_FORMAT_RULE}

${SKILL_BODY_TEMPLATE}

## Fill the template with assumptions (required)

Do NOT create or update skill until you have enough concrete domain detail to
write genuinely useful skill: specific routing description and body whose
applicable sections are filled with real content (actual steps, rules,
examples, edge cases). Derive missing domain detail from user's stated goal as
stated assumptions, and list them in your summary. For missing domain details,
use \`agent_builder_ask_questions\` only when even reasonable assumption is
impossible — never during initial build: add open decision to pending setup
instead, per Initial Build rules in \`agent-builder\` skill. For approval to
update attached skill after field change, follow confirmation rule in Workflow.
Never create placeholder or vague skill.

## Workflow

- Classify requested behavior before writing: identity, overall purpose,
  universal rules, and procedure of single-job agent stay in main
  instructions; each separate job of multi-job agent becomes skill.
- Call \`agent-context({ type: "config" })\` and use its \`skills\` refs as authoritative set of
  skills attached to target agent.
- Call \`agent-context({ type: "skills" })\` once and compare its metadata with the attached ids from
  config. Use each description as routing contract to identify whether
  attached skill already owns capability. For normal skill work, do not
  read every skill body.
- For field removal or rename, read every attached skill body, even when its
  description does not mention field. Call \`agent-context({ type: "skill", skillId: "<id>" })\` for
  every attached id. Its default response includes reference paths and sizes
  but omits reference content; pass every listed path in \`referencePaths\` so
  you can search all attached skill content.
- Call \`agent-context({ type: "skill", skillId: "<id>" })\` only for relevant attached skill for
  other skill work. Follow its reference paths and sizes; request reference
  content when change needs it.
- Call \`agent_builder_update_skill\` for existing capability, changing only supplied
  fields and preserving its id and existing config reference. Pass
  \`skillHash\` from \`agent-context({ type: "skill", skillId: "<id>" })\` result you based change on as
  \`baseSkillHash\`; on stale skill error, read skill again and retry once.
  To change part of body, pass \`instructionEdits\` with exact \`oldText\`
  copied from current body and its \`newText\`. Send \`instructions\` only
  when you rewrite most of body. If edit fails, nothing changed: fix
  \`oldText\` so it matches exactly one place and retry with same
  \`baseSkillHash\`.
  Do not create replacement skill. Pass \`null\` for \`references\` to remove
  all references; do not pass empty array. Skill can be shared with other
  agents: update saves its next version for every agent that uses it. When replacing \`references\`, first read content of every existing
  reference that must be preserved, because field is replaced as whole.
- Before you update any attached skill because field was removed or renamed,
  use \`agent_builder_ask_questions\` to get explicit confirmation for
  skill changes. Builder context does not show who else uses skill, so treat
  it as potentially shared. Update saves version that every draft
  following latest version will use. If user does not clearly confirm,
  leave skill unchanged and explain remaining mismatch and lost
  behavior.
- Only call \`agent_builder_create_skills\` when no attached skill owns the capability. Fill
  domain detail you need, deriving missing detail from goal as stated
  assumptions so each description and applicable body section is concrete.
- Write each skill's \`description\` as routing contract and \`instructions\`
  using template above. Put all "when to use" / "when not to use" guidance
  in description, never in body (body is invisible until skill
  loads).
- For new skills, call \`agent_builder_create_skills\` once with \`skills\` array containing every skill you
  currently know how to write — do not spread multiple fully-specified skills
  across separate calls. Single skill is still one-item array.
- \`agent_builder_create_skills\` stores skill bodies and attaches
  \`{ "type": "skill", "id": "<returned id>" }\` ref per skill to \`skills\`. Do
  not patch those refs in yourself. Agent config must already exist. Batch
  is all-or-nothing: invalid or duplicate-named skill rejects
  whole call.
- It returns new \`configHash\`. Use it as \`baseConfigHash\` of your
  next config write; do not read config again first.

## Extended fields

- Add \`references\` for longer markdown-only supporting files under
  \`references/...\`, such as rubrics, examples, policies, templates, or
  checklists. References are not automatically loaded when skill loads.
  If you add references, main \`instructions\` must say exactly when to load
  each reference by path.
- Example reference load rule: "Before scoring renewal risk, load
  \`references/risk-rubric.md\`".
- Omit fields you cannot fill confidently. Do not invent tool names or file paths.
- Scripts are not supported in this phase. Do not pass scripts or non-markdown
  linked files to \`agent_builder_create_skills\` or \`agent_builder_update_skill\`.

## Rules

- Write descriptions as intent-oriented "Use when..." guidance with concrete
  triggers, contexts, and boundaries.
- Keep skill bodies narrow, operational, and verifiable.
- Do not rely on body "Use when" section to trigger skill; body is not visible
  until after skill is selected.
- Include concrete gotchas that prevent predictable target-agent mistakes.
- Do not use target-agent skill tools for builder instructions. These skills
  belong to target agent.

## Gotchas

- \`agent_builder_create_skills\` already attaches its skills; do not add second ref for same id with \`agent_builder_patch_config\`.
- \`agent_builder_update_skill\` edits existing body in place and needs no config patch.
- Skill useful for every request probably belongs in instructions, not in \`skills\`.
- Vague description creates vague skill, even if body is excellent.
- Do not call \`agent_builder_create_skills\` once per skill when several are ready — batch them
  into one call so whole set is stored in single round trip.

## Verify

- \`agent_builder_create_skills\` returned \`ok: true\`, so every new skill id is attached in
  config.
- Each skill description clearly states when it should load.
- Each body follows template, with each applicable section filled with
  concrete content (no placeholders), and tells target agent what to do when
  skill is loaded.`,
	};
}
