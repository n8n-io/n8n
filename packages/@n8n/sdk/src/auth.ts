/**
 * Builds an HTTP `Authorization` header value from a bearer token.
 *
 * @param token - The bearer token to embed in the header.
 * @returns The fully-formed `Bearer <token>` value.
 */
export function buildAuthHeader(token: string): string {
	return `Bearer ${token}`;
}
