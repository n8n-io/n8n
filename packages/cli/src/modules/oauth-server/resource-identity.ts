import type { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

/**
 * Whether two RFC 8707 resource indicators name the same protected resource.
 *
 * String equality alone is too strict: the token endpoint deliberately echoes back
 * the caller's spelling when it names one of a resource's declared URLs (the
 * instance MCP server publishes several), so one grant can legitimately be referred
 * to by more than one URL.
 *
 * Fails closed — a URL that no longer resolves cannot be shown to name the resource
 * that was approved, so a deleted or unavailable resource never matches.
 */
export async function isSameProtectedResource(
	registry: ProtectedResourceRegistry,
	requested: string,
	granted: string,
): Promise<boolean> {
	if (requested === granted) return true;

	const [requestedResource, grantedResource] = await Promise.all([
		registry.getByResourceUrl(requested),
		registry.getByResourceUrl(granted),
	]);

	return (
		requestedResource !== undefined &&
		grantedResource !== undefined &&
		requestedResource.id === grantedResource.id
	);
}
