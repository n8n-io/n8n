import type { WorkflowActionSource } from '@/events/maps/relay.event-map';

/** A save through a tool records the tool after the author's name. */
const MARKER_BY_SOURCE = new Map<WorkflowActionSource, string>([
	['n8n-mcp', ' (via MCP)'],
	['n8n-ai', ' (with n8n Assistant)'],
]);

/** The `authors` a version records for a save by `name` through `source`. */
export function formatVersionAuthors(name: string, source?: WorkflowActionSource): string {
	const marker = source === undefined ? undefined : MARKER_BY_SOURCE.get(source);
	return `${name}${marker ?? ''}`;
}

/** The author's name in a version's `authors`, without the tool marker. */
export function versionAuthorName(authors: string): string {
	for (const marker of MARKER_BY_SOURCE.values()) {
		if (authors.endsWith(marker)) return authors.slice(0, -marker.length);
	}
	return authors;
}
