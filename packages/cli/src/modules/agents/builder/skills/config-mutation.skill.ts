import type { RuntimeSkill } from '@n8n/agents';

import { getConfigRulesSection, getSchemaReferenceSection } from '../agents-builder-prompts';

export function configMutationSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-config-mutation',
		name: 'Agent builder config mutation',
		description:
			'Use before reading, writing, replacing, or patching the target agent JSON config.',
		instructions: `\
Use this skill whenever you call \`read_config\`, \`write_config\`, or \`patch_config\`.

${getConfigRulesSection()}

${getSchemaReferenceSection()}

Mutation protocol:
- Call \`read_config\` immediately before every \`write_config\` or \`patch_config\`.
- For \`write_config\`, send the complete config JSON string and the \`baseConfigHash\` returned by that same \`read_config\`.
- For \`patch_config\`, send RFC 6902 operations as a JSON string plus that \`baseConfigHash\`.
- Use \`/field\`, \`/nested/field\`, \`/array/0\`, and \`/array/-\` JSON Pointer paths.
- On \`stage: "stale"\`, retry once from the returned \`config\` and \`configHash\`; never retry from memory.
- On parse, patch, or schema errors, fix the payload before trying again.
- When attaching a target-agent skill, append to \`/skills/-\` if \`skills\` exists; otherwise add \`/skills\` with an array containing the skill ref.`,
	};
}
