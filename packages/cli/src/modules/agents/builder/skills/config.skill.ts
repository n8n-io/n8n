import type { RuntimeSkill } from '@n8n/agents';

import { getConfigMutationPrompt } from '../prompts/config-mutation.prompt';

/** Generated from the config schema, so it ships from the agents module rather than as markdown. */
export function configSkill(): RuntimeSkill {
	return {
		id: 'agent-builder-config',
		name: 'Agent Builder Config',
		description:
			'Load before first agent_builder_write_config or agent_builder_patch_config call in conversation. Contains Agent config rules, config schema reference, and recipes for config writes.',
		recommendedTools: ['agent-context', 'agent_builder_write_config', 'agent_builder_patch_config'],
		instructions: getConfigMutationPrompt(),
	};
}
