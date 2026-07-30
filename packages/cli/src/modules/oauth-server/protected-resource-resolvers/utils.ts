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

/**
 * Form-trigger OAuth2 is opt-in. When the flag is off, `n8nUserAuth` form triggers
 * keep their existing cookie/HMAC auth and must not be exposed as OAuth protected
 * resources, so the resolvers short-circuit.
 */
export function isFormOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2 === 'true';
}

/**
 * Webhook-trigger OAuth2 is opt-in. When the flag is off, `n8nOAuth2` webhook
 * triggers must not be exposed as OAuth protected resources, so the resolver
 * short-circuits.
 */
export function isWebhookOAuth2Enabled(): boolean {
	return process.env.N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS === 'true';
}

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

	// Preserve the query string: for webhook triggers it carries the `methods`
	// disambiguator (see `methodsQueryString`), which `resolveByPath` parses back out.
	return url.pathname.slice(basePath.length) + url.search;
}

/**
 * Canonical form of a trigger's HTTP method-set: upper-cased, de-duplicated and
 * sorted, so the same set always serialises identically on both the mint and the
 * verify side. This is what makes `path + method-set` a stable resource identity.
 */
export function canonicalMethodSet(methods: Iterable<string>): string[] {
	return [...new Set([...methods].map((method) => method.toUpperCase()))].sort();
}

/** Serialise a method-set as the `?methods=…` query appended to a resource URL/path. Empty set → no query. */
export function methodsQueryString(methods: string[]): string {
	return methods.length > 0 ? `?methods=${methods.join(',')}` : '';
}

/** Parse a `methods` query value (e.g. `GET,POST`) into a canonical method-set, or `undefined` if absent. */
export function parseMethodsParam(value: string | null | undefined): string[] | undefined {
	if (!value) return undefined;
	const methods = value
		.split(',')
		.map((method) => method.trim())
		.filter((method) => method.length > 0);
	return methods.length > 0 ? canonicalMethodSet(methods) : undefined;
}
