const trimTrailingSlash = (path: string): string => (path.endsWith('/') ? path.slice(0, -1) : path);

/**
 * Builds the RFC 9728 protected-resource metadata URL for a resource.
 *
 * When the resource sits under the instance's public base URL, the well-known
 * segment goes after that base path. A reverse proxy that exposes n8n under a
 * subpath strips the subpath before forwarding, so the path-inserted URL at the
 * origin root is not reachable.
 */
export function buildProtectedResourceMetadataUrl(
	resourceUrl: string,
	publicBaseUrl?: string,
): string {
	const resource = new URL(resourceUrl);
	const resourcePath = resource.pathname === '/' ? '' : resource.pathname;

	let basePath = '';
	if (publicBaseUrl) {
		try {
			const base = new URL(publicBaseUrl);
			if (base.origin === resource.origin) {
				basePath = trimTrailingSlash(base.pathname);
			}
		} catch {
			// An invalid public base URL falls back to the origin-root form.
		}
	}

	const isUnderBase =
		basePath !== '' && (resourcePath === basePath || resourcePath.startsWith(`${basePath}/`));
	const pathPrefix = isUnderBase ? basePath : '';
	const relativePath = isUnderBase ? resourcePath.slice(basePath.length) : resourcePath;

	return `${resource.origin}${pathPrefix}/.well-known/oauth-protected-resource${relativePath}${resource.search}`;
}
