import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { mintActionToken } from '@n8n/engine';
import { OperationalError } from 'n8n-workflow';

/** The control plane server has its own port, so it needs no editor API prefix. */
const STATUS_CALLBACK_PATH = '/internal/status-callback';

/**
 * Calls the control plane server on the engine's behalf.
 *
 * The reverse of `EngineDataPlaneClient`: the engine runs in this same process
 * when the `engine-v2` module is enabled, but it still reports status over
 * HTTP. Keeping both directions of the seam network-shaped is what lets the
 * engine move out of the process later without changing either side.
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
			// `controlPlaneHost` is a bind address, not a destination, so it is not
			// dialable. Default to loopback and let `N8N_ENGINE_CONTROL_PLANE_BASE_URL`
			// override when the control plane server answers somewhere else.
			baseURL:
				engineConfig.controlPlaneBaseUrl || `http://127.0.0.1:${engineConfig.controlPlanePort}`,
			// A factory, not a fixed value: every request gets a fresh short-lived
			// token, and `engineConfig.authSecret` is read at request time — after
			// the module generates it, which is after this constructor runs.
			headers: () => ({
				authorization: `Bearer ${mintActionToken(this.engineConfig.authSecret, 'lifecycle-events:write')}`,
			}),
		});
	}

	/**
	 * Backs the engine's `lifecycleEventCallback`. Throws on a refused batch: the
	 * engine's publisher decides what a failed delivery costs, this seam only
	 * reports it.
	 */
	async sendLifecycleEvents(events: LifecycleEvent[], signal: AbortSignal): Promise<void> {
		const response = await this.http.request<unknown>({
			url: STATUS_CALLBACK_PATH,
			method: 'POST',
			body: { events },
			json: true,
			returnFullResponse: true,
			// Inspect the status here rather than catching a generic request error.
			ignoreHttpStatusErrors: true,
			// The callback token must reach the configured control plane and nowhere
			// else. Following a redirect would forward it to whatever host the
			// response names.
			disableFollowRedirect: true,
			// The engine owns the deadline, and aborts when a batch outlives it, so
			// the request is cancelled rather than outliving the batch it carries.
			// No client timeout here: a second, shorter one would make the engine's
			// policy unreachable.
			abortSignal: signal,
		});

		// 3xx included: redirects are not followed, so a redirecting target is a
		// misconfiguration, not a hop.
		if (response.statusCode >= 300) {
			throw new OperationalError(
				`Control plane refused a lifecycle event batch with ${response.statusCode}`,
			);
		}
	}
}
