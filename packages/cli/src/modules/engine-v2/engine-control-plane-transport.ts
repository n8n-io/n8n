import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { ActionScope } from '@n8n/engine';
import { mintActionToken } from '@n8n/engine';

/**
 * Builds the HTTP clients that call the control plane server.
 *
 * Every caller needs the same base URL, SSRF policy and token minting, and
 * differs only in the scope of the token. Configuring this once keeps the
 * callers identical in everything but their scope.
 */
@Service()
export class EngineControlPlaneTransport {
	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly outboundHttp: OutboundHttp,
	) {}

	/** Returns a client that sends a fresh action token with `scope` on every request. */
	forScope(scope: ActionScope): HttpRequestClient {
		return this.outboundHttp.requests({
			// Fixed, n8n-controlled host.
			useDefaultSsrfPolicy: 'unsafe',
			// A bind address is not dialable, so default to loopback.
			baseURL:
				this.engineConfig.controlPlaneBaseUrl ||
				`http://127.0.0.1:${this.engineConfig.controlPlanePort}`,
			// A factory: each request needs a fresh token, and the secret is set later.
			headers: () => ({
				authorization: `Bearer ${mintActionToken(this.engineConfig.authSecret, scope)}`,
			}),
		});
	}
}
