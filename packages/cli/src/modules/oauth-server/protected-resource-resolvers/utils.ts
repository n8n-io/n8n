/**
 * Scopes advertised for per-workflow MCP trigger resources. Empty on purpose:
 * the gate enforces no scopes and tokens carry none, and an empty list makes
 * the protected-resource metadata omit `scopes_supported`.
 */
export const WORKFLOW_MCP_TRIGGER_SCOPES: string[] = [];

/** Scopes advertised for per-workflow Form trigger resources. Empty, like MCP triggers. */
export const FORM_TRIGGER_SCOPES: string[] = [];

/** Scopes advertised for per-workflow Webhook trigger resources. */
export const WEBHOOK_TRIGGER_SCOPES: string[] = [];

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
 *
 * The query string is dropped unless `preserveQuery` is set: only webhook triggers
 * carry one (the `?method=` selector), and the other resolvers match on exact paths,
 * so keeping a query for them would turn a tolerated extra parameter into a miss.
 */
export function resourceUrlToWebhookPath(
	resourceUrl: string,
	webhookBaseUrl: string,
	{ preserveQuery = false }: { preserveQuery?: boolean } = {},
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

	return url.pathname.slice(basePath.length) + (preserveQuery ? url.search : '');
}

/**
 * Serialise the HTTP method a webhook resource URL is scoped to, as `?method=GET`.
 *
 * One path can host several triggers as long as their methods are disjoint, so the
 * method selects which trigger a resource URL names. It is a *selector*, not part
 * of the trigger's identity — see the resolver for why that distinction matters.
 */
export function methodQueryString(method: string): string {
	return `?method=${method.toUpperCase()}`;
}

/** Parse a `method` query value into its canonical form, or `undefined` if absent. */
export function parseMethodParam(value: string | null | undefined): string | undefined {
	const method = value?.trim().toUpperCase();
	return method === '' ? undefined : method;
}
