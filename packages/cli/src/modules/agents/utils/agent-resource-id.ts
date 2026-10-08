import { generateNanoId } from '@n8n/utils/generate-nano-id';

type AgentResourceIdPrefix = 'skill' | 'task';

export function generateAgentResourceId(
	prefix: AgentResourceIdPrefix | undefined,
	existingIds: Iterable<string> = [],
): string {
	const existing = new Set(existingIds);

	for (let attempt = 0; attempt < 10; attempt++) {
		const suffix = generateNanoId();
		const id = prefix ? `${prefix}_${suffix}` : suffix;
		if (!existing.has(id)) return id;
	}

	throw new Error(`Could not generate unique ${prefix ?? 'agent resource'} id`);
}
