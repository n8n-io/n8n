import type { RuntimeSkill } from '@n8n/agents';

export function targetSkillsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-skills',
		name: 'Agent Builder Target Skills',
		description:
			'Use when creating reusable target-agent skills, playbooks, policies, style guides, or domain instructions with create_skill that should load only for relevant future requests; not for builder guidance or one-off instructions.',
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

## Workflow

- Call \`create_skill\` with \`name\`, \`description\`, and \`body\`.
- Treat the description as the routing contract: it is what the runtime sees
  before deciding whether to load the skill.
- Put all "when to use" and "when not to use" guidance in the description.
- The body is loaded only after the skill triggers, so it should be a compact
  operating manual: purpose, workflow, rules, gotchas, and verification where
  useful.
- Do not rely on a body "Use when" section for activation; include routing
  guidance in \`description\`.
- \`create_skill\` stores the body only; it does not attach the skill.
- After it returns an id, call \`read_config\`.
- Use \`patch_config\` or \`write_config\` to add \`{ "type": "skill", "id": "<returned id>" }\` to \`skills\`.

## Rules

- Write descriptions as intent-oriented "Use when..." guidance with concrete
  triggers, contexts, and boundaries.
- Keep skill bodies narrow, operational, and verifiable.
- Do not rely on a body "Use when" section to trigger the skill; the body is
  not visible until after the skill is selected.
- Include concrete gotchas that prevent predictable target-agent mistakes.
- Do not use \`create_skill\` for builder instructions. These skills belong to the target agent.

## Gotchas

- \`create_skill\` does not attach the skill to the target agent config.
- A skill that is useful for every request probably belongs in instructions, not in \`skills\`.
- A vague description creates a vague skill, even if the body is excellent.
- Do not create placeholder or vague skills; ask for missing domain details first.

## Verify

- The returned skill id is attached in config as \`{ "type": "skill", "id": "<returned id>" }\`.
- The skill description clearly states when it should load.
- The body tells the target agent what to do differently when the skill is loaded.`,
	};
}
