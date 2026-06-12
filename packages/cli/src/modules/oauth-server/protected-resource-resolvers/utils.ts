/**
 * Scopes advertised for per-workflow MCP trigger resources. Empty on purpose:
 * the gate enforces no scopes and tokens carry none, and an empty list makes
 * the protected-resource metadata omit `scopes_supported`.
 */
export const WORKFLOW_MCP_TRIGGER_SCOPES: string[] = [];

export function trimTrailingSlash(path: string): string {
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	return path;
}

export function trimSlashes(path: string): string {
	if (path.startsWith('/')) {
		path = path.slice(1);
	}
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	return path;
}
