import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { WFRT_WEBHOOK_PREFIX } from './compiled-engine.types';
import { WfrtAdminClient } from './wfrt-admin.client';

/** Headers that belong to one connection, or that change when the body is read again. */
const SKIPPED_REQUEST_HEADERS = new Set([
	'host',
	'connection',
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

		const headers: Record<string, string> = {};
		for (const [name, value] of Object.entries(request.headers)) {
			if (value === undefined || SKIPPED_REQUEST_HEADERS.has(name)) continue;
			headers[name] = Array.isArray(value) ? value.join(', ') : value;
		}
		// `wfrt` reads bodies by Content-Length only.
		headers['content-length'] = String(hasBody ? body.length : 0);

		const url = wfrtWebhookUrl(this.client.publicUrl, path, request.originalUrl ?? request.url);
		let upstream: globalThis.Response;
		try {
			// eslint-disable-next-line n8n-local-rules/no-uncentralized-http -- loopback port of the local wfrt process
			upstream = await fetch(url, {
				method: request.method,
				headers,
				body:
					hasBody && request.method !== 'GET' && request.method !== 'HEAD'
						? new Uint8Array(body)
						: undefined,
				redirect: 'manual',
			});
		} catch (error) {
			this.logger.warn('Could not reach wfrt for a webhook request', {
				error: error instanceof Error ? error.message : String(error),
			});
			response.status(502).json({ message: 'The compiled workflow engine is not reachable.' });
			return;
		}

		response.status(upstream.status);
		upstream.headers.forEach((value, name) => {
			if (!SKIPPED_RESPONSE_HEADERS.has(name)) response.setHeader(name, value);
		});
		response.end(Buffer.from(await upstream.arrayBuffer()));
	}
}
