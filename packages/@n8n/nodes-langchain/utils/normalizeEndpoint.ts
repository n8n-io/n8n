/**
 * Removes surrounding spaces and any trailing slash from a stored endpoint.
 * A client appends a path to it (`/openai/...`, `/chat/completions`), so a trailing slash leaves a
 * doubled slash in the path. Some services serve that, but a gateway in front of them does not have to.
 */
export function normalizeEndpoint(endpoint: string | undefined): string | undefined {
	return endpoint?.trim().replace(/\/+$/, '');
}
