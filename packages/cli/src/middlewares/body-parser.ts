import { parseIncomingMessage } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { Request, RequestHandler } from 'express';
import { jsonParse, sanitizeXmlName } from 'n8n-workflow';
import { parse as parseQueryString } from 'querystring';
import getRawBody from 'raw-body';
import { type Readable } from 'stream';
import { Parser as XmlParser } from 'xml2js';
import { createGunzip, createInflate } from 'zlib';

import { BadRequestError, UnprocessableRequestError } from '@n8n/errors';

const xmlParser = new XmlParser({
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

const isClientAbortError = (error: unknown): boolean =>
	error instanceof Error &&
	'type' in error &&
	// raw-body sets these error.type values for a client aborting mid-read.
	(error.type === 'stream.not.readable' || error.type === 'request.aborted');

/** The `Content-Encoding` values whose body `rawBodyReader` keeps in decoded form. */
const bodyDecoders = { gzip: createGunzip, deflate: createInflate } as const;

/**
 * Whether `rawBodyReader` decodes a body with this `Content-Encoding`. Code that
 * sends `rawBody` on uses this to know that the bytes are no longer encoded.
 */
export const isDecodedBodyEncoding = (
	encoding: string | undefined,
): encoding is keyof typeof bodyDecoders =>
	encoding !== undefined && Object.hasOwn(bodyDecoders, encoding);

export const rawBodyReader: RequestHandler = (req, _res, next) => {
	parseIncomingMessage(req);

	req.readRawBody = async () => {
		if (!req.rawBody) {
			let stream: Readable = req;
			let contentLength: string | undefined;
			const contentEncoding = req.headers['content-encoding'];
			if (isDecodedBodyEncoding(contentEncoding)) {
				stream = req.pipe(bodyDecoders[contentEncoding]());
			} else {
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

type ParseBodyText = (text: string) => unknown;

/** The parser for a content type, or undefined when n8n keeps only the raw bytes. */
const bodyTextParserFor = (contentType: string | undefined): ParseBodyText | undefined => {
	if (contentType === 'application/json') return (text) => jsonParse(stripBom(text));
	if (contentType?.endsWith('/xml') || contentType?.endsWith('+xml')) {
		return async (text) => await xmlParser.parseStringPromise(text);
	}
	if (contentType === 'application/x-www-form-urlencoded') {
		return (text) => parseQueryString(stripBom(text), undefined, undefined, { maxKeys: 1000 });
	}
	if (contentType === 'text/plain') return (text) => text;
	return undefined;
};

export const parseBody = async (req: Request) => {
	// Skip multipart requests (e.g., file uploads) - these need specialized parsing by multer.
	// Reading the body stream here would consume it, making it unavailable for multer processing.
	if (req.contentType?.startsWith('multipart/')) {
		return;
	}

	await req.readRawBody();
	const { rawBody, contentType, encoding } = req;
	const parse = bodyTextParserFor(contentType);
	if (!rawBody?.length || !parse) return;
	try {
		req.body = await parse(rawBody.toString(encoding));
	} catch (error) {
		throw new UnprocessableRequestError('Failed to parse request body', ensureError(error).message);
	}
};

export const bodyParser: RequestHandler = async (req, _res, next) => {
	await parseBody(req);
	req.body ??= {};
	next();
};
