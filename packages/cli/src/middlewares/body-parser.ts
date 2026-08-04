import { parseIncomingMessage } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { jsonParse, sanitizeXmlName } from 'n8n-workflow';
import { parse as parseQueryString } from 'querystring';
import getRawBody from 'raw-body';
import { type Readable } from 'stream';
import { Parser as XmlParser } from 'xml2js';
import { createGunzip, createInflate } from 'zlib';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

const xmlParser = new XmlParser({
	async: true,
	normalize: true, // Trim whitespace inside text nodes
	normalizeTags: true, // Transform tags to lowercase
	explicitArray: false, // Only put properties in array if length > 1
	tagNameProcessors: [sanitizeXmlName],
	attrNameProcessors: [sanitizeXmlName],
});

const payloadSizeMax = Container.get(GlobalConfig).endpoints.payloadSizeMax;

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
				req.body = jsonParse(rawBody.toString(encoding));
			} else if (contentType?.endsWith('/xml') || contentType?.endsWith('+xml')) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				req.body = await xmlParser.parseStringPromise(rawBody.toString(encoding));
			} else if (contentType === 'application/x-www-form-urlencoded') {
				req.body = parseQueryString(rawBody.toString(encoding), undefined, undefined, {
					maxKeys: 1000,
				});
			} else if (contentType === 'text/plain') {
				req.body = rawBody.toString(encoding);
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
