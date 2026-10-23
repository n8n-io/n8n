import { UnprocessableRequestError } from '@n8n/errors';
import type { RequestHandler } from 'express';
import { jsonParse } from 'n8n-workflow';

/**
 * SCIM clients send `application/scim+json` (RFC 7644 section 3.1), which the
 * global body parser does not recognise as JSON, so it leaves `req.body` empty
 * and every write fails validation. It has already read the raw body by the
 * time route middlewares run, so parse it here rather than widening JSON
 * parsing for every route in the product.
 */
export const scimBodyParser: RequestHandler = (req, _res, next) => {
	if (req.contentType !== 'application/scim+json' || !req.rawBody?.length) return next();

	try {
		const text = req.rawBody.toString(req.encoding);
		// A leading BOM is not valid JSON, but RFC 8259 section 8.1 lets us ignore it.
		req.body = jsonParse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
	} catch (error) {
		return next(
			new UnprocessableRequestError('Failed to parse request body', (error as Error).message),
		);
	}

	return next();
};
