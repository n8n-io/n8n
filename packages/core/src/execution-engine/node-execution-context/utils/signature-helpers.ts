import crypto from 'crypto';
import type { Request } from 'express';

import { WAITING_TOKEN_QUERY_PARAM } from '../../../constants';

/**
 * Generate signature token from url and secret
 */
export function generateSignatureToken(url: string, secret: string) {
	const token = crypto.createHmac('sha256', secret).update(url).digest('hex');
	return token;
}

/**
 * Validate signature token in the request
 */
export function validateSignatureInRequest(req: Request, secret: string) {
	try {
		const token = req.query[WAITING_TOKEN_QUERY_PARAM];

		if (typeof token !== 'string') return false;

		const parsedUrl = new URL(req.url, `${req.protocol}://${req.headers.host}`);
		parsedUrl.searchParams.delete(WAITING_TOKEN_QUERY_PARAM);
		const url = parsedUrl.toString();

		const expectedToken = generateSignatureToken(url, secret);

		const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
		return valid;
	} catch (error) {
		return false;
	}
}
