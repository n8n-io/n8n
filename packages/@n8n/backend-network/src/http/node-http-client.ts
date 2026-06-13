import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IRequestOptions,
} from 'n8n-workflow';

import { httpRequest } from './axios/request';
import { executeLegacyRequest, type LegacyRequestCallbacks } from './legacy-request';
import type { SsrfOption } from './node-agents';
import { SsrfProtectionService } from '../ssrf';

export interface NodeHttpClientOptions {
	/**
	 * SSRF protection level.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;
}

/**
 * High-level client for outbound HTTP requests made on behalf of n8n nodes.
 *
 * This is the axios-based request engine that backs every node HTTP call. It is
 * the counterpart to {@link OutboundHttpClient} (undici-based, for SDKs that
 * accept a `fetch`/dispatcher/agent): same "create once, call a verb" shape, but
 * for the n8n request pipeline (`IHttpRequestOptions` in, response out).
 *
 * The client carries the SSRF policy, so callers no longer thread an
 * `ssrfBridge` argument through every request. Proxy routing stays per-request
 * (read from `options.proxy` / the environment), because node requests choose
 * their proxy per call rather than per client.
 */
export interface NodeHttpClient {
	/**
	 * Performs an outbound HTTP request from an `IHttpRequestOptions` descriptor,
	 * applying this client's SSRF policy, user-agent defaults and proxy routing.
	 *
	 * Returns the parsed body, or the full response when `options.returnFullResponse` is set.
	 */
	request(options: IHttpRequestOptions): Promise<IN8nHttpFullResponse | IN8nHttpResponse>;

	/**
	 * Performs a request using the deprecated `request`-style options
	 * (`IRequestOptions`), applying the same SSRF policy as {@link request}.
	 *
	 * `callbacks.onFetched` runs once after data is successfully fetched (used by
	 * the execution engine to fire its `nodeFetchedData` hook).
	 *
	 * @deprecated Use {@link request} with `IHttpRequestOptions`. This exists only
	 * to back the deprecated `request` helpers.
	 */
	requestLegacy(options: IRequestOptions, callbacks?: LegacyRequestCallbacks): Promise<unknown>;
}

/**
 * Factory for {@link NodeHttpClient}s.
 *
 * Injectable via `@n8n/di`.
 * Backs the deprecated `request` helpers via `requestLegacy`
 * (the execution engine's `proxyRequestToAxios` resolves it from the container),
 * and is the entry point new node HTTP code should wire against.
 */
@Service()
export class NodeHttpClientFactory {
	constructor(
		private readonly ssrfProtection: SsrfProtectionService,
		private readonly logger: Logger,
	) {}

	/**
	 * Creates a node HTTP client.
	 *
	 * Defaults: `ssrf` enabled (uses the container's `SsrfProtectionService`).
	 * Pass `{ ssrf: 'disabled' }` to opt out.
	 */
	create(options?: NodeHttpClientOptions): NodeHttpClient {
		const ssrf = options?.ssrf ?? this.ssrfProtection;
		const ssrfBridge = ssrf === 'disabled' ? undefined : ssrf;

		return {
			request: async (requestOptions) => await httpRequest(requestOptions, ssrfBridge),
			requestLegacy: async (requestOptions, callbacks) =>
				await executeLegacyRequest(requestOptions, ssrfBridge, this.logger, callbacks),
		};
	}
}
