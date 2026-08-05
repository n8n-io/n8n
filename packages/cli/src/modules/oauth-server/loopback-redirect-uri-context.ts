import { AsyncLocalStorage } from 'async_hooks';

/**
 * The `redirect_uri` of the in-flight authorization request.
 *
 * The MCP SDK's authorize handler requires the requested `redirect_uri` to be
 * one of the client's registered URIs, exactly. A native client binds an
 * ephemeral loopback port at request time, so the port cannot be registered in
 * advance (RFC 8252 §7.3) — the authorization server has to accept any port on
 * an otherwise registered loopback URI.
 *
 * The SDK resolves the client through `clientsStore.getClient(clientId)`, which
 * has no access to the request, so the requested URI is carried here instead of
 * being persisted onto the registration.
 */
const requestedRedirectUri = new AsyncLocalStorage<string>();

export function withRequestedRedirectUri<T>(redirectUri: string | undefined, fn: () => T): T {
	return redirectUri === undefined ? fn() : requestedRedirectUri.run(redirectUri, fn);
}

export function getRequestedRedirectUri(): string | undefined {
	return requestedRedirectUri.getStore();
}
