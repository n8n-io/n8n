import { bufferToString, isCharsetSupported, parseIncomingMessage } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { jsonParse, sanitizeXmlName } from 'n8n-workflow';
import { parse as parseQueryString } from 'querystring';
import getRawBody from 'raw-body';
import { type Readable } from 'stream';
import { Parser as XmlParser } from 'xml2js';
import { createGunzip, createInflate } from 'zlib';

import { BadRequestError, UnprocessableRequestError, UserError } from '@n8n/errors';

// One parser per request: xml2js keeps parse state on the instance, and async
// mode spreads large bodies over several ticks.
const createXmlParser = () =>
	new XmlParser({
		async: true,
		normalize: true, // Trim whitespace inside text nodes
		normalizeTags: true, // Transform tags to lowercase
		explicitArray: false, // Only put properties in array if length > 1
		tagNameProcessors: [sanitizeXmlName],
		attrNameProcessors: [sanitizeXmlName],
	});

const payloadSizeMax = Container.get(GlobalConfig).endpoints.payloadSizeMax;

/**
 * A leading byte order mark is not valid JSON, but RFC 8259 §8.1 permits
 * implementations to ignore it rather than treating it as an error. Both the
 * UTF-8 (EF BB BF) and UTF-16 (FF FE) BOMs decode to U+FEFF, so stripping the
 * decoded character covers every declared charset.
 */
const stripBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

const usesUtf8Escapes = (charset: string) =>
	/^(utf(8|16|32)(le|be)?|ucs[24])$/.test(charset.toLowerCase().replace(/[^\da-z]/g, ''));

const hexValue = (byte: number) => {
	if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
	const lower = byte | 0x20;
	return lower >= 0x61 && lower <= 0x66 ? lower - 0x57 : -1;
};

const percentDecode = (component: string) => {
	const bytes = Buffer.from(component, 'latin1');
	let length = 0;
	for (let i = 0; i < bytes.length; i++) {
		const high = bytes[i] === 0x25 ? hexValue(bytes[i + 1]) : -1;
		const low = high === -1 ? -1 : hexValue(bytes[i + 2]);
		if (low === -1) {
			bytes[length++] = bytes[i];
		} else {
			bytes[length++] = (high << 4) | low;
			i += 2;
		}
	}
	return bytes.subarray(0, length);
};

const parseForm = (body: Buffer, charset: string) => {
	if (usesUtf8Escapes(charset)) {
		return parseQueryString(stripBom(bufferToString(body, charset)), undefined, undefined, {
			maxKeys: 1000,
		});
	}
	if (!isCharsetSupported(charset)) throw new UserError(`Unknown charset: ${charset}`);
	return parseQueryString(body.toString('latin1'), undefined, undefined, {
		maxKeys: 1000,
		decodeURIComponent: (component) => bufferToString(percentDecode(component), charset),
	});
};

const isClientAbortError = (error: unknown): boolean =>
	error instanceof Error &&
	'type' in error &&
	// raw-body sets these error.type values for a client aborting mid-read.
	(error.type === 'stream.not.readable' || error.type === 'request.aborted');

export const rawBodyReader: RequestHandler = (req, _res, next) => {
	parseIncomingMessage(req);

	req.readRawBody = async () => {
		if (!req.rawBody) {
			let stream: Readable = req;
			let contentLength: string | undefined;
			const contentEncoding = req.headers['content-encoding'];
			switch (contentEncoding) {
				case 'gzip':
					stream = req.pipe(createGunzip());
					break;
				case 'deflate':
					stream = req.pipe(createInflate());
					break;
				default:
					contentLength = req.headers['content-length'];
			}

			// Client aborted before we read the body: treat as client error, not a 500.
			if (req.destroyed || !stream.readable) {
				throw new BadRequestError('Request body stream was aborted or is not readable');
			}

			try {
				req.rawBody = await getRawBody(stream, {
					length: contentLength,
					limit: `${String(payloadSizeMax)}mb`,
				});
			} catch (error) {
				if (isClientAbortError(error)) {
					throw BadRequestError.wrap(
						'Request body stream was aborted mid-read or is not readable',
						error,
					);
				}
				throw error;
			}
			req._body = true;
		}
	};

	next();
};

export const parseBody = async (req: Request) => {
	// Skip multipart requests (e.g., file uploads) - these need specialized parsing by multer.
	// Reading the body stream here would consume it, making it unavailable for multer processing.
	if (req.contentType?.startsWith('multipart/')) {
		return;
	}

	await req.readRawBody();
	const { rawBody, contentType, encoding } = req;
	if (rawBody?.length) {
		try {
			if (contentType === 'application/json') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				req.body = jsonParse(stripBom(bufferToString(rawBody, encoding)));
			} else if (contentType?.endsWith('/xml') || contentType?.endsWith('+xml')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				req.body = await createXmlParser().parseStringPromise(bufferToString(rawBody, encoding));
			} else if (contentType === 'application/x-www-form-urlencoded') {
				req.body = parseForm(rawBody, encoding);
			} else if (contentType === 'text/plain') {
				req.body = bufferToString(rawBody, encoding);
			}
		} catch (error) {
			throw new UnprocessableRequestError('Failed to parse request body', (error as Error).message);
		}
	}
};

export const bodyParser: RequestHandler = async (req, _res, next) => {
	await parseBody(req);
	req.body ??= {};
	next();
};
