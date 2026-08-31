import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { mintActionToken } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';

import { STATUS_CALLBACK_PATH } from './engine-v2.constants';

/**
 * Posts lifecycle events to the control plane server. Over HTTP even in-process,
 * so the engine can move out of it without changing either side.
 */
@Service()
export class EngineControlPlaneClient {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly engineConfig: EngineConfig,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			// Fixed, n8n-controlled host.
			useDefaultSsrfPolicy: 'unsafe',
			// A bind address is not dialable, so default to loopback.
			baseURL:
				engineConfig.controlPlaneBaseUrl || `http://127.0.0.1:${engineConfig.controlPlanePort}`,
			// A factory: each request needs a fresh token, and the secret is set later.
			headers: () => ({
				authorization: `Bearer ${mintActionToken(this.engineConfig.authSecret, 'lifecycle-events:write')}`,
			}),
		});
	}

	/** Throws on a refused batch; the engine decides what a failed delivery costs. */
	async sendLifecycleEvents(events: LifecycleEvent[], signal: AbortSignal): Promise<void> {
		const response = await this.http.request<unknown>({
			url: STATUS_CALLBACK_PATH,
			method: 'POST',
			body: { events },
			json: true,
			returnFullResponse: true,
			// Inspect the status here rather than catching a generic request error.
			ignoreHttpStatusErrors: true,
			// A redirect would forward the token to whatever host it names.
			disableFollowRedirect: true,
			// The engine owns the deadline and aborts on it. A client timeout would
			// fire first and make that unreachable.
			abortSignal: signal,
		});

		// 3xx too: redirects are not followed, so one is a misconfiguration.
		if (response.statusCode >= 300) {
			throw new OperationalError(
				`Control plane refused a lifecycle event batch with ${response.statusCode}`,
			);
		}
	}
}
