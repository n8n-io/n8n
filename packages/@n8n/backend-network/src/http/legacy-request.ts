/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { Logger } from '@n8n/backend-common';
import type { AxiosRequestConfig } from 'axios';
import type { IRequestOptions } from 'n8n-workflow';
import { NodeSslError } from 'n8n-workflow';
import { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';

import type { SsrfBridge } from '../ssrf';
import { invokeAxios } from './axios/invoke';
import { buildAxiosConfigFromLegacyRequest, buildLegacyAgentOptions } from './axios/legacy';
import { followSsrfRedirects, shouldFollowRedirectsManually } from './axios/redirect';
import { resolveLegacyRequestUrl, throwIfDomainNotAllowed, validateUrlSsrf } from './axios/utils';
import { binaryToString } from './binary-string';
import { parseIncomingMessage } from './parse-incoming-message';

export interface LegacyRequestCallbacks {
	/**
	 * Invoked once after the request successfully fetched data, before the result
	 * is returned. Not called when the request throws or when an error response is
	 * returned because `simple: false` was set.
	 */
	onFetched?: () => Promise<void> | void;
}

/**
 * Runs the deprecated `request`-style HTTP path (`IRequestOptions`): axios
 * translation, SSRF pre-flight, domain allowlist enforcement, response
 * normalisation and axios error massaging.
 *
 * Exposed to callers as {@link HttpRequestClient.requestLegacy}; kept in its own
 * module so the whole legacy path can be removed in one go once the deprecated
 * request helpers are gone.
 *
 * @deprecated Backs the deprecated `request` helpers.
 */
export async function executeLegacyRequest(
	requestObject: IRequestOptions,
	ssrfBridge: SsrfBridge | undefined,
	logger: Logger,
	callbacks?: LegacyRequestCallbacks,
): Promise<unknown> {
	let axiosConfig: AxiosRequestConfig = {
		maxBodyLength: Infinity,
		// -1 is the Axios sentinel for "no limit". Infinity also means no limit but
		// Axios 1.15.1+ treats any value > -1 as a finite cap, wrapping stream responses
		// in Readable.from() even when the limit is Infinity. That breaks the downstream
		// `instanceof IncomingMessage` checks in parseIncomingMessage / prepareBinaryData.
		maxContentLength: -1,
	};

	const url = resolveLegacyRequestUrl(requestObject);
	await validateUrlSsrf(url, ssrfBridge);

	axiosConfig = Object.assign(
		axiosConfig,
		await buildAxiosConfigFromLegacyRequest(requestObject, ssrfBridge),
	);
	throwIfDomainNotAllowed(axiosConfig, requestObject.allowedDomains);

	try {
		const response = shouldFollowRedirectsManually(axiosConfig, requestObject.proxy, ssrfBridge)
			? await followSsrfRedirects(axiosConfig, {
					ssrf: ssrfBridge,
					proxyConfig: requestObject.proxy,
					agentOptions: buildLegacyAgentOptions(requestObject),
					allowedDomains: requestObject.allowedDomains,
					sendCredentialsOnCrossOriginRedirect:
						requestObject.sendCredentialsOnCrossOriginRedirect ?? true,
					authSendImmediately: requestObject.auth?.sendImmediately,
				})
			: await invokeAxios(axiosConfig, requestObject.auth?.sendImmediately);
		let body = response.data;
		if (body instanceof IncomingMessage && axiosConfig.responseType === 'stream') {
			parseIncomingMessage(body);
		} else if (body === '') {
			body = axiosConfig.responseType === 'arraybuffer' ? Buffer.alloc(0) : undefined;
		}
		await callbacks?.onFetched?.();
		return requestObject.resolveWithFullResponse
			? {
					body,
					headers: { ...response.headers },
					statusCode: response.status,
					statusMessage: response.statusText,
					request: response.request,
				}
			: body;
	} catch (error: any) {
		const { config, response } = error;

		// Axios hydrates the original error with more data. We extract them.
		// https://github.com/axios/axios/blob/master/lib/core/enhanceError.js
		// Note: `code` is ignored as it's an expected part of the errorData.
		if (error.isAxiosError) {
			error.config = error.request = undefined;
			// Carry only the config keys that were actually set, so the error shape
			// matches the previous `pick(config, [...])` behaviour (no `undefined`
			// keys for properties the request never had).
			const options: Record<string, unknown> = {};
			for (const key of ['url', 'method', 'data', 'headers'] as const) {
				if (config && key in config) {
					options[key] = config[key];
				}
			}
			error.options = options;
			if (response) {
				logger.debug('Request proxied to Axios failed', { status: response.status });
				let responseData = response.data;

				if (Buffer.isBuffer(responseData) || responseData instanceof Readable) {
					responseData = await binaryToString(responseData);
				}

				if (requestObject.simple === false) {
					if (requestObject.resolveWithFullResponse) {
						return {
							body: responseData,
							headers: response.headers,
							statusCode: response.status,
							statusMessage: response.statusText,
						};
					} else {
						return responseData;
					}
				}

				error.message = `${response.status as number} - ${JSON.stringify(responseData)}`;
				throw Object.assign(error, {
					statusCode: response.status,
					/**
					 * Axios adds `status` when serializing, causing `status` to be available only to the client.
					 * Hence we add it explicitly to allow the backend to use it when resolving expressions.
					 */
					status: response.status,
					error: responseData,
					response: {
						headers: response.headers,
						status: response.status,
						statusText: response.statusText,
					},
				});
			} else if ('rejectUnauthorized' in requestObject && error.code?.includes('CERT')) {
				throw new NodeSslError(error);
			}
		}

		throw error;
	}
}
