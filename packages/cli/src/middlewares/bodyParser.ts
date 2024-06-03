import getRawBody from 'raw-body';
import { type Readable } from 'stream';
import { createGunzip, createInflate } from 'zlib';
import type { Request, RequestHandler } from 'express';
import { parse as parseQueryString } from 'querystring';
import { Parser as XmlParser } from 'xml2js';
import { parseIncomingMessage } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import config from '@/config';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

const xmlParser = new XmlParser({
	async: true,
	normalize: true, // Trim whitespace inside text nodes
	normalizeTags: true, // Transform tags to lowercase
	explicitArray: false, // Only put properties in array if length > 1
});

const payloadSizeMax = config.getEnv('endpoints.payloadSizeMax');
export const rawBodyReader: RequestHandler = async (req, _res, next) => {
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
			req.rawBody = await getRawBody(stream, {
				length: contentLength,
				limit: `${String(payloadSizeMax)}mb`,
			});
			req._body = true;
		}
	};

	next();
};

export const parseBody = async (req: Request) => {
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
	if (!req.body) req.body = {};
	next();
};
