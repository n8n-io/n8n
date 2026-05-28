import { generateNanoId } from '@n8n/utils';

type AgentResourceIdPrefix = 'skill' | 'tool';

export function generateAgentResourceId(
	prefix: AgentResourceIdPrefix,
	existingIds: Iterable<string> = [],
): string {
	const existing = new Set(existingIds);

	for (let attempt = 0; attempt < 10; attempt++) {
		const id = `${prefix}_${generateNanoId()}`;
		if (!existing.has(id)) return id;
	}

	throw new Error(`Could not generate unique ${prefix} id`);
}
