import type { RuntimeSkill } from '@n8n/agents';

export function targetSkillsSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-target-skills',
		name: 'Agent builder target skills',
		description:
			'Use when creating reusable instruction bundles for the target agent to load later.',
		instructions: `\
Use target-agent skills for reusable instructions, playbooks, style guides,
policies, or domain knowledge the target agent should load only when relevant.

Flow:
- Call \`create_skill\` with \`name\`, \`description\`, and \`body\`.
- The description should say when the runtime should load the skill.
- \`create_skill\` stores the body only; it does not attach the skill.
- After it returns an id, call \`read_config\`.
- Use \`patch_config\` or \`write_config\` to add \`{ "type": "skill", "id": "<returned id>" }\` to \`skills\`.
- Do not use \`create_skill\` for builder instructions. These skills belong to the target agent.`,
	};
}
