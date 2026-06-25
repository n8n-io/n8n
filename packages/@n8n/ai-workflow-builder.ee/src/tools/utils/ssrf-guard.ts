/**
 * SSRF guard contract for the web_fetch tool.
 *
 * This is the narrow slice of `@n8n/backend-network`'s `SsrfBridge` that the
 * web_fetch tool actually needs: URL validation, redirect validation and a
 * secure DNS lookup. `SsrfProtectionService` implements `SsrfBridge`, so the cli
 * composition root passes it directly; `createPassthroughSsrfGuard` below is the
 * no-op variant. `SsrfBridge` is imported as a type only (via the dependency-free
 * `/transport` subpath), so this leaf package takes no runtime dependency on the
 * network package.
 */
import type { SsrfBridge } from '@n8n/backend-network/transport';
import { createResultOk, ensureError } from 'n8n-workflow';
import dns from 'node:dns';
import type { LookupFunction } from 'node:net';

export type SsrfGuard = Pick<
	SsrfBridge,
	'validateUrl' | 'validateRedirectSync' | 'createSecureLookup'
>;

/**
 * Thrown inside `beforeRedirect` to halt axios auto-follow when a redirect crosses to a
 * different host, so the tool can run its HITL domain-approval flow for the new host.
 */
export class CrossHostRedirectError extends Error {
	constructor(readonly finalUrl: string) {
		super(`Redirect to a different host: ${finalUrl}`);
		this.name = 'CrossHostRedirectError';
	}
}

/**
 * No-op guard used when SSRF protection is disabled (and in the eval harness / tests).
 * IP-level checks become no-ops; the tool's domain-approval layer still applies.
 */
export function createPassthroughSsrfGuard(): SsrfGuard {
	return {
		validateUrl: async () => createResultOk(undefined),
		validateRedirectSync: () => {},
		// `dns.lookup` is a valid LookupFunction; axios callbackifies it.
		createSecureLookup: () => dns.lookup as unknown as LookupFunction,
	};
}

/**
 * Walk an axios error's cause chain to detect an SSRF block surfaced from
 * `createSecureLookup`/`validateRedirectSync`. The chain is typically
 * `AxiosError → RedirectionError → SsrfBlockedIpError` (depth <= 4). Detected by name
 * so the builder package needs no import of cli's `SsrfBlockedIpError`.
 */
export function isSsrfBlockedError(error: unknown): boolean {
	let current: Error | undefined = ensureError(error);
	for (let depth = 0; depth < 4 && current; depth++) {
		if (current.name === 'SsrfBlockedIpError') return true;
		current = current.cause ? ensureError(current.cause) : undefined;
	}
	return false;
}

/** Same cause-chain walk, returning the `CrossHostRedirectError` if present. */
export function findCrossHostRedirectError(error: unknown): CrossHostRedirectError | undefined {
	let current: Error | undefined = ensureError(error);
	for (let depth = 0; depth < 4 && current; depth++) {
		if (current instanceof CrossHostRedirectError) return current;
		current = current.cause ? ensureError(current.cause) : undefined;
	}
	return undefined;
}
