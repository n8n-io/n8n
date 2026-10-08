import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	request as httpRequest,
	type Agent,
	type ClientRequest,
	type IncomingMessage,
	type OutgoingHttpHeaders,
	type RequestOptions,
	type ServerResponse,
} from 'node:http';
import { request as httpsRequest } from 'node:https';
import { urlToHttpOptions } from 'node:url';

import { isDecodedBodyEncoding } from '@/middlewares/body-parser';

import {
	forwardedRequestHeaders,
	hardenedResponseHeaders,
	previewAnswerHeaders,
} from './sandbox-preview-headers';

/** Where one preview request goes on the sandbox service. */
export interface ServiceTarget {
	/** The base URL of the sandbox service, as the preview entry names it. */
	serviceUrl: string;
	/** The port route, the rest of the path and the query. */
	path: string;
	apiKey?: string;
	agents: { httpAgent: Agent; httpsAgent: Agent };
}

export interface ForwardEvents {
	/** Sees the answer of the service before the browser gets it. */
	onResponse: (answer: IncomingMessage) => void;
	/** The service could not be reached, or it stopped in the middle of an answer. */
	onError: (error: Error) => void;
}

/**
 * The n8n body parser reads each body before routing and keeps the bytes. It
 * does not read a multipart body, which is then streamed on as it arrives.
 */
function readBody(req: IncomingMessage): Buffer | undefined {
	const body: unknown = req.rawBody;
	return Buffer.isBuffer(body) ? body : undefined;
}

/**
 * All headers of the request to the service. They are set when the request is
 * made, so no later event can skip the allowlist or the API key.
 */
export function serviceRequestHeaders(
	req: IncomingMessage,
	apiKey: string | undefined,
	body: Buffer | undefined,
): OutgoingHttpHeaders {
	const headers = forwardedRequestHeaders(req.headers);
	// The hop to the service is n8n's own, whatever the browser or a reverse proxy sent.
	headers.connection = 'keep-alive';
	if (apiKey) headers['x-api-key'] = apiKey;
	if (!body) return headers;
	// The kept bytes are complete. They are decoded only for the encodings that n8n decodes.
	delete headers['transfer-encoding'];
	delete headers['content-length'];
	if (isDecodedBodyEncoding(req.headers['content-encoding'])) delete headers['content-encoding'];
	if (body.length > 0) headers['content-length'] = body.length;
	return headers;
}

function openServiceRequest(
	req: IncomingMessage,
	target: ServiceTarget,
	headers: OutgoingHttpHeaders,
): ClientRequest {
	const url = new URL(target.serviceUrl);
	const secure = url.protocol === 'https:';
	const options: RequestOptions = {
		...urlToHttpOptions(url),
		// The path as the client sent it: a URL parse would resolve its dot segments.
		path: `${url.pathname.replace(/\/+$/, '')}${target.path}`,
		method: req.method,
		headers,
		// One agent serves one protocol, and keep-alive saves a handshake for each asset.
		agent: secure ? target.agents.httpsAgent : target.agents.httpAgent,
	};
	return secure ? httpsRequest(options) : httpRequest(options);
}

/** Answers 502, or breaks the answer off when part of it is already out. */
function failOnce(res: ServerResponse, events: ForwardEvents, clientGone: () => boolean) {
	let failed = false;
	return (error: Error) => {
		if (failed || clientGone()) return;
		failed = true;
		events.onError(error);
		// Text added to an answer that is already out would end it as if it were complete.
		if (res.headersSent) {
			res.destroy();
			return;
		}
		res.writeHead(502, { ...previewAnswerHeaders(), 'content-type': 'text/plain' });
		res.end('Bad Gateway');
	};
}

function relayAnswer(
	answer: IncomingMessage,
	res: ServerResponse,
	events: ForwardEvents,
	fail: (error: Error) => void,
): void {
	answer.on('error', fail);
	// When the service stops in the middle of an answer, end the browser's answer
	// too. Otherwise the frame waits with no end and keeps a connection to n8n.
	answer.on('close', () => {
		if (!answer.complete) res.destroy();
	});
	events.onResponse(answer);
	res.statusCode = answer.statusCode ?? 502;
	for (const [name, value] of Object.entries(hardenedResponseHeaders(answer.headers))) {
		if (value !== undefined) res.setHeader(name, value);
	}
	answer.pipe(res);
}

function sendBody(req: IncomingMessage, upstream: ClientRequest, body: Buffer | undefined): void {
	if (body) {
		upstream.end(body);
		return;
	}
	req.on('error', () => upstream.destroy());
	req.pipe(upstream);
}

/**
 * Sends one browser request on to the sandbox service and relays the answer.
 * It works with any agent, also with the proxy agents of the instance proxy
 * settings, which open their socket after the request is made.
 */
export function forwardToService(
	req: IncomingMessage,
	res: ServerResponse,
	target: ServiceTarget,
	events: ForwardEvents,
): void {
	// The browser left during the access checks, so the service gets no request.
	if (res.destroyed) return;
	let clientGone = false;
	const fail = failOnce(res, events, () => clientGone);
	const body = readBody(req);
	let upstream: ClientRequest;
	try {
		upstream = openServiceRequest(req, target, serviceRequestHeaders(req, target.apiKey, body));
	} catch (error) {
		fail(ensureError(error));
		return;
	}
	upstream.on('error', fail);
	upstream.on('response', (answer) => relayAnswer(answer, res, events, fail));
	// The browser left before the answer ended: stop the request to the service too.
	res.on('close', () => {
		if (res.writableFinished) return;
		clientGone = true;
		upstream.destroy();
	});
	sendBody(req, upstream, body);
}
