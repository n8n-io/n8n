export const BUILDER_V2_GHOST_ID_PREFIX = '__builder-v2-ghost-';

export function builderV2GhostId(sessionId: string, idx: number): string {
	return `${BUILDER_V2_GHOST_ID_PREFIX}${sessionId}-${idx}`;
}

export function isBuilderV2GhostId(id: string): boolean {
	return id.startsWith(BUILDER_V2_GHOST_ID_PREFIX);
}
