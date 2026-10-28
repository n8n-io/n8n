import type { AgentJsonConfig } from '@n8n/api-types';

import type { AgentDefinition } from '../utils/agent-definition';

/**
 * Preserve existing and disabled refs while new refs require an available body.
 * Skill refs are not pruned here: `AgentSkillRefsService.replaceDraftRefs`
 * checks them against the skills module.
 */
export function pruneMissingConfigReferences(
	config: AgentJsonConfig,
	previousSchema: AgentJsonConfig | null,
	available: Pick<AgentDefinition, 'tools'> & { taskIds: ReadonlySet<string> },
): void {
	if (config.tools !== undefined) {
		const existingIds = new Set(
			(previousSchema?.tools ?? []).filter((ref) => ref.type === 'custom').map((ref) => ref.id),
		);
		config.tools = config.tools.filter(
			(ref) =>
				ref.enabled === false ||
				ref.type !== 'custom' ||
				existingIds.has(ref.id) ||
				Object.hasOwn(available.tools, ref.id),
		);
	}
	if (config.tasks !== undefined) {
		config.tasks = config.tasks.filter((ref) => available.taskIds.has(ref.id));
	}
}
