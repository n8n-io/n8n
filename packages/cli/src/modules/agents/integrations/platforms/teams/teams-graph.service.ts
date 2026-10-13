import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';

import { stringProperty } from '../../integration-helpers';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_TIMEOUT_MS = 30_000;

/**
 * The bearer token is Microsoft's, so the request must not be able to leave
 * Graph. A path is concatenated onto the base, and `..` segments walk out of
 * `/v1.0` -- so the whole parsed URL is checked, and the parsed URL is what
 * gets sent.
 */
function graphUrl(path: string): string {
	let parsed: URL;
	try {
		parsed = new URL(`${GRAPH_BASE_URL}${path}`);
	} catch {
		throw new UnexpectedError(
			'Refusing to send a Microsoft Graph token to a path that is not a URL.',
		);
	}
	if (!parsed.href.startsWith(`${GRAPH_BASE_URL}/`)) {
		throw new UnexpectedError('Refusing to send a Microsoft Graph token elsewhere.');
	}
	return parsed.href;
}

export interface GraphResponse {
	statusCode: number;
	body: unknown;
	ok: boolean;
}

/**
 * The smallest Microsoft Graph client the setup needs.
 *
 * Callers read the status code themselves rather than being handed an
 * exception, because the flow branches on what Graph refuses: a 404 on the app
 * registration is how a deleted app is told from a failed read.
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
				url: graphUrl(path),
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
