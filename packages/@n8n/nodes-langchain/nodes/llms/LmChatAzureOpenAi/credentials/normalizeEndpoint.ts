/**
 * Removes surrounding spaces and any trailing slash from a stored endpoint.
 * The SDK appends `/openai/...` to it, so a trailing slash leaves a doubled slash in the path.
 * Azure serves that, but a gateway in front of it does not have to.
 */
export function normalizeEndpoint(endpoint: string | undefined): string | undefined {
	return endpoint?.trim().replace(/\/+$/, '');
}
