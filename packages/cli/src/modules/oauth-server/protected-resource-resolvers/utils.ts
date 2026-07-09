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

/**
 * Map an RFC 8707 resource URL to the instance-relative path it is served at, or
 * `undefined` if the URL is not under this instance's webhook base URL.
 *
 * The base URL may carry a path prefix (e.g. `WEBHOOK_URL=https://host/n8n/` or a
 * non-root `N8N_PATH`), so the prefix is stripped before the path is returned.
 * This keeps `resolveByPath` — which matches against `/{endpoint}/…` — working the
 * same for sub-path deployments as for root deployments, and matches the path the
 * unauthenticated well-known route already receives (relative to the mount point).
 */
export function resourceUrlToWebhookPath(
	resourceUrl: string,
	webhookBaseUrl: string,
): string | undefined {
	let url: URL;
	try {
		url = new URL(resourceUrl);
	} catch {
		return undefined;
	}

	const base = new URL(webhookBaseUrl);
	if (url.origin !== base.origin) {
		return undefined;
	}

	const basePath = trimTrailingSlash(base.pathname);
	if (basePath && !url.pathname.startsWith(`${basePath}/`)) {
		return undefined;
	}

	return url.pathname.slice(basePath.length);
}
