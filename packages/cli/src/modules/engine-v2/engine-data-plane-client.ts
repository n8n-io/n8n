import { isObjectLiteral } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EngineErrorResponse, StartExecutionRequest, StartExecutionResult } from '@n8n/engine';
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

	constructor(engineConfig: EngineConfig, outboundHttp: OutboundHttp) {
		this.http = outboundHttp.requests({
			// Fixed, n8n-controlled host.
			ssrf: 'disabled',
			// `engineConfig.host` is a bind address, not a destination, so it is not
			// dialable. Default to loopback and let `N8N_ENGINE_BASE_URL` override
			// when the engine answers somewhere else.
			baseURL: engineConfig.baseUrl || `http://127.0.0.1:${engineConfig.port}`,
		});
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
		});

		if (response.statusCode >= 400) throw this.toError(response.statusCode, response.body);

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
