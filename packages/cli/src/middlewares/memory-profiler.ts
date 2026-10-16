import { isRecord } from '@n8n/utils/is-record';
import { redactDeep, redactText } from '@n8n/utils/redaction/redact-text';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import type { RequestHandler } from 'express';
import { channel } from 'node:diagnostics_channel';

const requests = channel('n8n.memory-profiler.requests');
let sequence = 0;
const bodyLimit = 64 * 1024;
const captures = new Map<string, unknown>();
let activeResponses = 0;

function captureBody(value: unknown) {
	try {
		let remaining = bodyLimit;
		let nodes = 2000;
		const text =
			typeof value === 'string'
				? value
				: JSON.stringify(value, (_key, item: unknown) => {
						if (--nodes < 0) throw new Error('Body exceeds capture limit');
						if (typeof item === 'string') remaining -= item.length;
						if (remaining < 0) throw new Error('Body exceeds capture limit');
						return item;
					});
		if (text === undefined) return { omitted: 'unavailable' };
		if (Buffer.byteLength(text) > bodyLimit) return { omitted: 'size-limit' };
		let content: unknown;
		try {
			content = JSON.parse(text);
		} catch {
			content = text;
		}
		const redacted =
			typeof content === 'string'
				? redactText(content).text
				: JSON.stringify(redactDeep(content, { redactSensitiveKeys: true }).value);
		if (Buffer.byteLength(redacted) > bodyLimit) return { omitted: 'size-limit' };
		return { text: redacted };
	} catch {
		return { omitted: 'size-limit' };
	}
}

function isText(contentType: unknown) {
	return (
		typeof contentType === 'string' &&
		/^(text\/(?!event-stream)|application\/(?:[\w.+-]*json|[\w.+-]*xml|x-www-form-urlencoded))/i.test(
			contentType,
		)
	);
}

function captureUrl(originalUrl: string) {
	if (Buffer.byteLength(originalUrl) > bodyLimit) return '[URL exceeds capture limit]';
	const url = new URL(originalUrl, 'http://localhost');
	for (const key of new Set(url.searchParams.keys())) {
		const values = url.searchParams.getAll(key);
		url.searchParams.delete(key);
		for (const value of values)
			url.searchParams.append(key, isSensitiveKey(key) ? '[REDACTED]' : redactText(value).text);
	}
	return `${redactText(url.pathname).text}${url.search}`;
}

export function createMemoryProfilerMiddleware(
	restEndpoint: string,
	publicApiEndpoint: string,
): RequestHandler {
	Reflect.set(globalThis, Symbol.for('n8n.memory-profiler.requests'), true);
	Reflect.set(globalThis, Symbol.for('n8n.memory-profiler.capture'), captures);
	const prefixes = [
		{ api: 'public', prefix: `/${publicApiEndpoint}` },
		{ api: 'internal', prefix: `/${restEndpoint}` },
	];
	return (req, res, next) => {
		if (!requests.hasSubscribers) return next();
		const path = req.path.toLowerCase();
		const target = prefixes.find(
			({ prefix }) => path === prefix.toLowerCase() || path.startsWith(`${prefix.toLowerCase()}/`),
		);
		if (!target) return next();
		let requestDetails = false;
		let responseDetails = false;
		for (const capture of captures.values()) {
			if (
				!isRecord(capture) ||
				!isRecord(capture.state) ||
				typeof capture.state.expiresAt !== 'number' ||
				capture.state.expiresAt < Date.now()
			)
				continue;
			requestDetails ||= capture.requestDetails === true;
			responseDetails ||= capture.responseDetails === true;
		}
		const chunks: Buffer[] = [];
		// Bound concurrent response buffers as well as each body.
		const captureResponse = responseDetails && activeResponses < 32;
		if (captureResponse) activeResponses++;
		let responseBytes = 0;
		const captureChunk = (chunk: unknown, encoding: unknown) => {
			if (!isText(res.getHeader('content-type')) || res.getHeader('content-encoding')) return;
			if (responseBytes > bodyLimit) return;
			let buffer: Buffer;
			if (typeof chunk === 'string') {
				if (chunk.length > bodyLimit) {
					responseBytes = bodyLimit + 1;
					chunks.length = 0;
					return;
				}
				buffer = Buffer.from(
					chunk,
					typeof encoding === 'string' && Buffer.isEncoding(encoding) ? encoding : 'utf8',
				);
			} else if (chunk instanceof Uint8Array) {
				if (chunk.byteLength > bodyLimit) {
					responseBytes = bodyLimit + 1;
					chunks.length = 0;
					return;
				}
				buffer = Buffer.from(chunk);
			} else return;
			responseBytes += buffer.length;
			if (chunks.length >= 128) responseBytes = bodyLimit + 1;
			if (responseBytes > bodyLimit) chunks.length = 0;
			else chunks.push(buffer);
		};
		const originalWrite = res.write;
		const originalEnd = res.end;
		if (captureResponse) {
			res.write = new Proxy(originalWrite, {
				apply(fn, receiver, args: unknown[]) {
					captureChunk(args[0], args[1]);
					return Reflect.apply(fn, receiver, args);
				},
			});
			res.end = new Proxy(originalEnd, {
				apply(fn, receiver, args: unknown[]) {
					captureChunk(args[0], args[1]);
					return Reflect.apply(fn, receiver, args);
				},
			});
		}
		const startedAtMs = Date.now();
		const clock = performance.now();
		const identity = {
			id: ++sequence,
			pid: process.pid,
			api: target.api,
			method: req.method,
			startedAtMs,
		};
		requests.publish({ ...identity, event: 'start', route: `${target.prefix}/(pending)` });
		let finished = false;
		const finish = () => {
			if (finished) return;
			finished = true;
			res.off('finish', finish);
			res.off('close', finish);
			if (captureResponse) {
				activeResponses--;
				res.write = originalWrite;
				res.end = originalEnd;
			}
			const route: unknown = req.route;
			let pattern = `${target.prefix}/(unmatched)`;
			if (isRecord(route) && typeof route.path === 'string') {
				// Express mount paths contain resolved parameters. Keep their names instead.
				const params = Object.entries(req.params);
				const base = req.baseUrl
					.split('/')
					.map((part) => {
						let decoded: string;
						try {
							decoded = decodeURIComponent(part);
						} catch {
							return ':parameter';
						}
						const param = params.find(
							([, value]) => typeof value === 'string' && decoded === value,
						);
						return param ? `:${param[0]}` : part;
					})
					.join('/');
				pattern = `${base}${route.path}`;
			}
			const rawBody: unknown = requestDetails ? Reflect.get(req, 'rawBody') : undefined;
			const raw = Buffer.isBuffer(rawBody) ? rawBody : undefined;
			requests.publish({
				...identity,
				event: 'finish',
				route: pattern,
				durationMs: performance.now() - clock,
				statusCode: res.statusCode,
				aborted: !res.writableFinished,
				...(requestDetails
					? {
							request: {
								url: captureUrl(req.originalUrl),
								headers: captureBody(req.headers),
								body:
									!req.headers['content-length'] && !req.headers['transfer-encoding']
										? { omitted: 'unavailable' }
										: !isText(req.headers['content-type'])
											? { omitted: 'content-type' }
											: (raw?.length ?? 0) > bodyLimit
												? { omitted: 'size-limit' }
												: captureBody(req.body ?? raw?.toString('utf8')),
							},
						}
					: {}),
				...(responseDetails
					? {
							response: {
								headers: captureBody(res.getHeaders()),
								body: !captureResponse
									? { omitted: 'concurrency-limit' }
									: responseBytes > bodyLimit
										? { omitted: 'size-limit' }
										: !isText(res.getHeader('content-type')) || res.getHeader('content-encoding')
											? { omitted: 'content-type' }
											: captureBody(Buffer.concat(chunks).toString('utf8')),
							},
						}
					: {}),
			});
			chunks.length = 0;
		};
		res.once('finish', finish);
		res.once('close', finish);
		next();
	};
}
