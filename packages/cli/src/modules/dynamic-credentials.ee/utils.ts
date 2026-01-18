import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import type { Request } from 'express';

const BEARER_TOKEN_REGEX = /^[Bb][Ee][Aa][Rr][Ee][Rr]\s+(.+)$/;

export function getBearerToken(req: Request): string {
	const headerValue = req.headers['authorization']?.toString();

	if (!headerValue) {
		throw new UnauthenticatedError();
	}

	const result = BEARER_TOKEN_REGEX.exec(headerValue);
	const token = result ? result[1] : null;

	if (!token) {
		throw new BadRequestError('Authorization header is malformed');
	}

	return token;
}
