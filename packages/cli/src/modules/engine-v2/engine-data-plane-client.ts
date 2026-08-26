import { isObjectLiteral } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type {
	AuthenticatedCaller,
	EngineErrorResponse,
	StartExecutionRequest,
	StartExecutionResult,
} from '@n8n/engine';
import { mintIdentityToken } from '@n8n/engine';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, UserError } from 'n8n-workflow';

import type { EngineDataPlaneProvider } from '@/services/engine-data-plane-proxy.service';

/**
 * Calls the engine's HTTP API.
 *
 * The engine runs in this same process when the `engine-v2` module is enabled,
 * but the control plane still talks to it over HTTP. Keeping the seam
 * network-shaped is what lets the engine move out of the process later without
 * changing any caller.
 */
@Service()
export class EngineDataPlaneClient implements EngineDataPlaneProvider {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly engineConfig: EngineConfig,
		outboundHttp: OutboundHttp,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.http = outboundHttp.requests({
			// Fixed, n8n-controlled host.
			ssrf: 'disabled',
			// `engineConfig.host` is a bind address, not a destination, so it is not
			// dialable. Default to loopback and let `N8N_ENGINE_BASE_URL` override
			// when the engine answers somewhere else.
			baseURL: engineConfig.baseUrl || `http://127.0.0.1:${engineConfig.port}`,
			// A factory, not a fixed value: every request gets a fresh short-lived
			// token, and `engineConfig.authSecret` is read at request time — after
			// the module generates it, which is after this constructor runs.
			headers: () => ({
				authorization: `Bearer ${mintIdentityToken(this.engineConfig.authSecret, this.caller())}`,
			}),
		});
	}

	/**
	 * In a single-tenant deployment the CP is the tenant; cloud replaces
	 * `tenantId` with a real one.
	 */
	private caller(): AuthenticatedCaller {
		const { instanceId } = this.instanceSettings;
		return { cpId: instanceId, tenantId: instanceId };
	}

	async startExecution(request: StartExecutionRequest): Promise<StartExecutionResult> {
		const response = await this.http.request<StartExecutionResult | EngineErrorResponse>({
			url: '/api/workflow-executions',
			method: 'POST',
			body: request,
			json: true,
			returnFullResponse: true,
			// Inspect the status here so engine failures map onto n8n error types
			// instead of surfacing as a generic request error.
			ignoreHttpStatusErrors: true,
			// The identity token must reach the configured data plane and nowhere
			// else. Following a redirect would forward it to whatever host the
			// response names.
			disableFollowRedirect: true,
		});

		// 3xx included: redirects are not followed, so a redirecting target is a
		// misconfiguration, not a hop. Treating it as success would parse the
		// redirect body as an execution result.
		if (response.statusCode >= 300) throw this.toError(response.statusCode, response.body);

		return response.body as StartExecutionResult;
	}

	private toError(statusCode: number, body: unknown): Error {
		const { error, reason } = this.parseErrorResponse(body);
		const detail = reason ?? error;
		const suffix = detail ? `: ${detail}` : '';

		switch (statusCode) {
			case 400:
				return new UserError(`Engine rejected the workflow${suffix}`);
			case 429:
				return new OperationalError(`Engine did not admit the execution${suffix}`);
			case 501:
				return new UserError(`Engine does not support this workflow yet${suffix}`);
			default:
				return new OperationalError(`Engine responded with ${statusCode}${suffix}`);
		}
	}

	/**
	 * Reads the engine's error body. A non-engine failure — a proxy, a crash —
	 * may not carry that shape, so every field stays optional.
	 */
	private parseErrorResponse(body: unknown): Partial<EngineErrorResponse> {
		if (!isObjectLiteral(body)) return {};

		return body as Partial<EngineErrorResponse>;
	}
}
