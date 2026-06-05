import { SUPPORTED_AGENT_INTEGRATION_TYPES } from './agent-integration.schema';

const SUPPORTED_TOOL_TYPES = ['custom', 'workflow', 'node'] as const;
const SUPPORTED_SKILL_TYPES = ['skill'] as const;
const SUPPORTED_TASK_TYPES = ['task'] as const;

function filterUnsupportedTypedEntries(
	entries: unknown,
	supportedTypes: readonly string[],
): unknown {
	if (!Array.isArray(entries)) return entries;

	return entries.filter((entry) => {
		if (typeof entry !== 'object' || entry === null) {
			return true;
		}

		const type = (entry as { type?: unknown }).type;
		if (typeof type !== 'string') {
			return true;
		}

		return supportedTypes.includes(type);
	});
}

/**
 * Strip legacy or unsupported typed entries from agent JSON config before strict
 * Zod validation. Unknown top-level keys are still dropped by `AgentJsonConfigSchema`.
 *
 * Entries with a supported `type` but invalid required fields are kept so validation
 * can surface the error instead of silently discarding user mistakes.
 */
export function sanitizeAgentJsonConfig(raw: unknown): unknown {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return raw;
	}

	const config = raw as Record<string, unknown>;
	const sanitized: Record<string, unknown> = { ...config };

	if ('integrations' in sanitized) {
		sanitized.integrations = filterUnsupportedTypedEntries(
			sanitized.integrations,
			SUPPORTED_AGENT_INTEGRATION_TYPES,
		);
	}

	if ('tools' in sanitized) {
		sanitized.tools = filterUnsupportedTypedEntries(sanitized.tools, SUPPORTED_TOOL_TYPES);
	}

	if ('skills' in sanitized) {
		sanitized.skills = filterUnsupportedTypedEntries(sanitized.skills, SUPPORTED_SKILL_TYPES);
	}

	if ('tasks' in sanitized) {
		sanitized.tasks = filterUnsupportedTypedEntries(sanitized.tasks, SUPPORTED_TASK_TYPES);
	}

	return sanitized;
}
