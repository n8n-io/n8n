import { parse as parseContentDisposition } from 'content-disposition';
import { parse as parseContentType } from 'content-type';
import getRawBody from 'raw-body';
import { type RequestHandler } from 'express';
import { jsonParse } from 'n8n-workflow';
import config from '@/config';

const payloadSizeMax = config.getEnv('endpoints.payloadSizeMax');
export const rawBody: RequestHandler = async (req, res, next) => {
	if ('content-type' in req.headers) {
		const { type: contentType, parameters } = (() => {
			try {
				return parseContentType(req);
			} catch {
				return { type: undefined, parameters: undefined };
			}
		})();
		req.contentType = contentType;
		req.encoding = (parameters?.charset ?? 'utf-8').toLowerCase() as BufferEncoding;

		const contentDispositionHeader = req.headers['content-disposition'];
		if (contentDispositionHeader?.length) {
			const {
				type,
				parameters: { filename },
			} = parseContentDisposition(contentDispositionHeader);
			req.contentDisposition = { type, filename };
		}
	}

	req.readRawBody = async () => {
		if (!req.rawBody) {
			req.rawBody = await getRawBody(req, {
				length: req.headers['content-length'],
				limit: `${String(payloadSizeMax)}mb`,
			});
			req._body = true;
		}
	};

	next();
};

export const jsonParser: RequestHandler = async (req, res, next) => {
	await req.readRawBody();

	if (Buffer.isBuffer(req.rawBody)) {
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
