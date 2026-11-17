import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpRequest } from 'node:http';

import { WFRT_WEBHOOK_PREFIX } from './compiled-engine.types';
import { WfrtAdminClient } from './wfrt-admin.client';

/**
 * Headers that belong to one connection, or that change when the body is read again. `host`
 * and `connection` are not in the list: the trigger item shows the values that the caller
 * sent, in their place among the headers, as in v1.
 */
const SKIPPED_REQUEST_HEADERS = new Set([
	'keep-alive',
	'transfer-encoding',
	'content-length',
	'content-encoding',
	'upgrade',
	'expect',
]);

const SKIPPED_RESPONSE_HEADERS = new Set([
	'connection',
	'keep-alive',
	'transfer-encoding',
	'content-length',
	'content-encoding',
]);

/** The URL in `wfrt` for a production webhook path and the query of the request. */
export function wfrtWebhookUrl(publicUrl: string, path: string, originalUrl: string) {
	const query = originalUrl.includes('?') ? originalUrl.slice(originalUrl.indexOf('?')) : '';
	const cleanPath = path.replace(/^\/+/, '');
	return `${publicUrl}${WFRT_WEBHOOK_PREFIX}/${cleanPath}${query}`;
}

/** The headers of a webhook request that go to `wfrt`. */
export function forwardedHeaders(incoming: IncomingHttpHeaders): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(incoming)) {
		if (value === undefined || SKIPPED_REQUEST_HEADERS.has(name)) continue;
		headers[name] = Array.isArray(value) ? value.join(', ') : value;
	}
	return headers;
}

interface UpstreamResponse {
	status: number;
	headers: IncomingHttpHeaders;
	body: Buffer;
}

/**
 * One request to the webhook port of `wfrt`. It uses `node:http`, because `fetch` does not
 * send a `host` header that the caller gives.
 */
async function sendToWfrt(
	url: string,
	method: string,
	headers: Record<string, string>,
	body: Buffer | undefined,
): Promise<UpstreamResponse> {
	return await new Promise((resolve, reject) => {
		// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- loopback port of the local wfrt process
		const outgoing = httpRequest(url, { method, headers }, (incoming) => {
			const chunks: Buffer[] = [];
			incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
			incoming.on('error', reject);
			incoming.on('end', () =>
				resolve({
					status: incoming.statusCode ?? 502,
					headers: incoming.headers,
					body: Buffer.concat(chunks),
				}),
			);
		});
		outgoing.on('error', reject);
		outgoing.end(body);
	});
}

/**
 * Sends a production webhook request of a compiled workflow to `wfrt` and
 * writes the response of `wfrt` back. The workflow runs in `wfrt` from the
 * request to the response; n8n only passes the bytes on.
 */
@Service()
export class CompiledWebhookForwarder {
	constructor(
		private readonly client: WfrtAdminClient,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	async forward(request: Request, response: Response, path: string) {
		await request.readRawBody();
		const body = request.rawBody;
		const hasBody = body !== undefined && body.length > 0;

		const headers = forwardedHeaders(request.headers);
		// `wfrt` reads bodies by Content-Length only.
		headers['content-length'] = String(hasBody ? body.length : 0);

		const url = wfrtWebhookUrl(this.client.publicUrl, path, request.originalUrl ?? request.url);
		let upstream: UpstreamResponse;
		try {
			upstream = await sendToWfrt(
				url,
				request.method,
				headers,
				hasBody && request.method !== 'GET' && request.method !== 'HEAD' ? body : undefined,
			);
		} catch (error) {
			this.logger.warn('Could not reach wfrt for a webhook request', {
				error: error instanceof Error ? error.message : String(error),
			});
			response.status(502).json({ message: 'The compiled workflow engine is not reachable.' });
			return;
		}

		response.status(upstream.status);
		for (const [name, value] of Object.entries(upstream.headers)) {
			if (value !== undefined && !SKIPPED_RESPONSE_HEADERS.has(name))
				response.setHeader(name, value);
		}
		response.end(upstream.body);
	}
}
