import { MCP_SERVER_TOOL_NAME_MAX_LENGTH } from '@n8n/api-types';

const FALLBACK_TOOL_NAME = 'tool';

function trimUnderscores(value: string): string {
	return value.replace(/^_+|_+$/g, '');
}

/**
 * The default tool name of a workflow: lowercase letters, digits, and `_`, at most
 * 64 characters. Accents fall away, so "Créer" becomes "creer".
 */
export function toToolName(workflowName: string): string {
	const name = workflowName
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_');
	const trimmed = trimUnderscores(trimUnderscores(name).slice(0, MCP_SERVER_TOOL_NAME_MAX_LENGTH));
	return trimmed || FALLBACK_TOOL_NAME;
}

/** Adds `_2`, `_3`, and so on, when the server already has the name. */
export function uniqueToolName(name: string, taken: ReadonlySet<string>): string {
	if (!taken.has(name)) return name;
	for (let n = 2; ; n++) {
		const suffix = `_${n}`;
		const candidate = `${name.slice(0, MCP_SERVER_TOOL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
		if (!taken.has(candidate)) return candidate;
	}
}
