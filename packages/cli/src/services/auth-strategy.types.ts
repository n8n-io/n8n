import type { Request } from 'express';

/**
 * The resolved identity returned by an AuthStrategy on a successful match.
 * userId is the n8n user ID. scopes are the permissions granted for this
 * request. resource is an optional URN constraining which resource the
 * token may access (e.g. 'urn:n8n:project:abc123').
 */
export interface AuthResult {
	userId: string;
	scopes: string[];
	resource?: string;
}

/**
 * A single authentication strategy for the public API.
 * Return null if the strategy does not apply to the request (e.g. no
 * matching token header present) — this passes control to the next strategy.
 * Return a non-null AuthResult when the request is successfully authenticated.
 */
export interface AuthStrategy {
	authenticate(req: Request): Promise<AuthResult | null>;
}
