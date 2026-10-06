import type { AgentJsonConfig } from '@n8n/api-types';

import type { AgentDefinition } from '../utils/agent-definition';

/** Preserve existing and disabled refs while new refs require an available body. */
export function pruneMissingConfigReferences(
	config: AgentJsonConfig,
	previousSchema: AgentJsonConfig | null,
	available: Pick<AgentDefinition, 'tools' | 'skills'> & { taskIds: ReadonlySet<string> },
): void {
	if (config.skills !== undefined) {
		const existingIds = new Set((previousSchema?.skills ?? []).map((ref) => ref.id));
		config.skills = config.skills.filter(
			(ref) =>
				ref.enabled === false || existingIds.has(ref.id) || Boolean(available.skills[ref.id]),
		);
	}
	if (config.tools !== undefined) {
		const existingIds = new Set(
			(previousSchema?.tools ?? []).filter((ref) => ref.type === 'custom').map((ref) => ref.id),
		);
		config.tools = config.tools.filter(
			(ref) =>
				ref.enabled === false ||
				ref.type !== 'custom' ||
				existingIds.has(ref.id) ||
				Boolean(available.tools[ref.id]),
		);
	}
	if (config.tasks !== undefined) {
		config.tasks = config.tasks.filter((ref) => available.taskIds.has(ref.id));
	}
}
