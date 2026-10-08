import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import { stringProperty } from '../../integration-helpers';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_TIMEOUT_MS = 30_000;

export interface GraphResponse {
	statusCode: number;
	body: unknown;
	ok: boolean;
}

/**
 * The smallest Microsoft Graph client the setup needs.
 *
 * Callers read the status code themselves rather than being handed an
 * exception, because the flow branches on what Graph refuses: a 403 on the
 * publish call is how a user without the Teams admin role is recognised.
 */
@Service()
export class TeamsGraphService {
	constructor(
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	async request(
		accessToken: string,
		method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
		path: string,
		body?: unknown,
		/** Extra request headers, for the few calls Graph gates behind one. */
		headers: Record<string, string> = {},
	): Promise<GraphResponse> {
		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method,
				url: `${GRAPH_BASE_URL}${path}`,
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/json',
					...headers,
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: GRAPH_TIMEOUT_MS,
			});

		const ok = response.statusCode >= 200 && response.statusCode < 300;
		if (!ok) {
			this.logger.debug('[TeamsGraph] Graph refused a call', {
				method,
				path,
				statusCode: response.statusCode,
				error: describeGraphError(response.body) ?? graphErrorCode(response.body),
			});
		}
		return { statusCode: response.statusCode, body: response.body, ok };
	}

	/**
	 * The app catalog takes the package as a raw zip rather than JSON, so the
	 * body is sent unencoded with the zip content type.
	 */
	async postZip(accessToken: string, path: string, archive: Buffer): Promise<GraphResponse> {
		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method: 'POST',
				url: `${GRAPH_BASE_URL}${path}`,
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/zip',
				},
				body: archive,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: GRAPH_TIMEOUT_MS,
			});

		const ok = response.statusCode >= 200 && response.statusCode < 300;
		if (!ok) {
			// The outer code is generic for a rejected package; the reason is in the
			// inner code and the message, which name the manifest field at fault.
			this.logger.warn('[TeamsGraph] Graph refused the app package', {
				path,
				statusCode: response.statusCode,
				error: describeGraphError(response.body) ?? graphErrorCode(response.body),
			});
		}
		return { statusCode: response.statusCode, body: response.body, ok };
	}
}

/** Graph reports failures as `{ error: { code, message } }`. */
export function graphErrorCode(body: unknown): string | undefined {
	if (!isRecord(body)) return undefined;
	const error = body.error;
	return isRecord(error) ? stringProperty(error, 'code') : undefined;
}

export function graphErrorMessage(body: unknown): string | undefined {
	if (!isRecord(body)) return undefined;
	const error = body.error;
	return isRecord(error) ? stringProperty(error, 'message') : undefined;
}

/**
 * Graph puts the useful part of a rejected app package in `innerError.code` —
 * `UnableToParseTeamsAppManifest` and its hundred-odd siblings — while the outer
 * code stays generic.
 */
export function graphInnerErrorCode(body: unknown): string | undefined {
	if (!isRecord(body)) return undefined;
	const error = body.error;
	if (!isRecord(error)) return undefined;
	const inner = error.innerError;
	return isRecord(inner) ? stringProperty(inner, 'code') : undefined;
}

/**
 * What Graph said, in one line, for a message a user can act on. A bare "try
 * again" is useless when the cause is a named field in the app manifest.
 */
export function describeGraphError(body: unknown): string | undefined {
	const parts = [graphInnerErrorCode(body) ?? graphErrorCode(body), graphErrorMessage(body)].filter(
		(part): part is string => typeof part === 'string' && part.length > 0,
	);
	return parts.length > 0 ? parts.join(': ') : undefined;
}
