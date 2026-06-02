import { generateNanoId } from '@n8n/utils';

/**
 * Regex that both the JSON config schema (AgentJsonToolConfigSchema `id` field)
 * and the custom-tool storage key must satisfy. Tool names that do not match
 * cannot be used as config ids.
 */
export const CUSTOM_TOOL_ID_REGEX = /^[A-Za-z0-9_-]+$/;

type AgentResourceIdPrefix = 'skill' | 'task';

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
