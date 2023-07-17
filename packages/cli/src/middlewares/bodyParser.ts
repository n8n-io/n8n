import { parse as parseContentType } from 'content-type';
import getRawBody from 'raw-body';
import { type RequestHandler } from 'express';
import { jsonParse } from 'n8n-workflow';
import config from '@/config';

const payloadSizeMax = config.getEnv('endpoints.payloadSizeMax');
export const rawBody: RequestHandler = async (req, res, next) => {
	if ('content-type' in req.headers) {
		const { type, parameters } = (() => {
			try {
				return parseContentType(req);
			} catch {
				return { type: undefined, parameters: undefined };
			}
		})();
		req.contentType = type;
		req.encoding = (parameters?.charset ?? 'utf-8').toLowerCase() as BufferEncoding;
	}

	if (req.contentType !== 'multipart/form-data') {
		req.rawBody = await getRawBody(req, {
			length: req.headers['content-length'],
			limit: `${String(payloadSizeMax)}mb`,
		});
	}

	next();
};

export const jsonParser: RequestHandler = async (req, res, next) => {
	if (Buffer.isBuffer(req.rawBody)) {
		req._body = true;

		if (req.contentType === 'application/json') {
			try {
				req.body = jsonParse<unknown>(req.rawBody.toString(req.encoding));
			} catch (error) {
				res.status(400).send({ error: 'Failed to parse request body' });
				return;
			}
		} else {
			req.body = {};
		}
	}

	next();
};
