import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class InvalidAppVersionTarballError extends BadRequestError {
	constructor(kind: 'source' | 'dist', reason: string) {
		super(`Invalid ${kind} tarball: ${reason}`);
	}
}
