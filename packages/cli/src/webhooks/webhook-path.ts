/**
 * A webhook path with `:param` segments is resolved by looking up its first
 * segment in the `webhookId` column and its remaining segment count in
 * `pathLength` (see `WebhookService.findDynamicWebhook`). That first segment is
 * the route's namespace — historically always the node's `webhookId`, now
 * whatever the webhook description's `namespace` resolves to.
 *
 * The stored `webhookPath` includes the namespace, so it equals the public URL
 * path and the `(webhookPath, method)` primary key is unique per namespace
 * rather than per bare template.
 */

export function trimWebhookPath(path: string): string {
	let trimmed = path.trim();
	if (trimmed.startsWith('/')) trimmed = trimmed.slice(1);
	if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
	return trimmed;
}

export function isDynamicWebhookPath(path: string): boolean {
	return path.startsWith(':') || path.includes('/:');
}

export function applyWebhookNamespace(path: string, namespace?: string): string {
	if (!namespace || !isDynamicWebhookPath(path)) return path;
	if (path === namespace || path.startsWith(`${namespace}/`)) return path;
	return `${namespace}/${path}`;
}

/**
 * First usable namespace among the candidates. `IWebhookData.namespace` is
 * resolved from an expression, so it is not guaranteed to be a string.
 */
export function pickWebhookNamespace(...candidates: unknown[]): string | undefined {
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate !== '') return candidate;
	}
	return undefined;
}

/**
 * Namespace and remaining segment count of an already-namespaced dynamic path.
 * Returns `undefined` for static paths, which are matched by exact string.
 */
export function splitNamespacedWebhookPath(
	path: string,
): { namespace: string; pathLength: number } | undefined {
	if (!isDynamicWebhookPath(path)) return undefined;
	const [namespace, ...rest] = path.split('/');
	if (!namespace || namespace.startsWith(':')) return undefined;
	return { namespace, pathLength: rest.length };
}

/** Template segments of a stored path, with the namespace segment dropped. */
export function templateSegments(webhookPath: string): string[] {
	return webhookPath.split('/').slice(1);
}

/**
 * Brings a row's path and its dynamic-lookup keys into agreement. Shared by both
 * registration paths (the publication registrar and `ActiveWorkflowManager`) so
 * they cannot drift — a mismatch here makes a webhook unroutable.
 */
export function normalizeStoredWebhookPath(
	webhook: { webhookPath: string; webhookId?: string; pathLength?: number },
	namespace?: string,
): void {
	webhook.webhookPath = applyWebhookNamespace(trimWebhookPath(webhook.webhookPath), namespace);

	const dynamic = splitNamespacedWebhookPath(webhook.webhookPath);
	if (!dynamic) return;

	webhook.webhookId = dynamic.namespace;
	webhook.pathLength = dynamic.pathLength;
}
