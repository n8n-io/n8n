import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';
import { ConflictError } from '@/errors/response-errors/conflict.error.js';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error.js';
import { NotFoundError } from '@/errors/response-errors/not-found.error.js';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error.js';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '../entities/package-export.errors.js';
import { classifyPackageFailure } from '../package-failure-classifier.js';

describe('classifyPackageFailure', () => {
	test.each([
		['PackageEntityAccessDeniedError', new PackageEntityAccessDeniedError('x'), 'access-denied'],
		['PackageEntityNotFoundError', new PackageEntityNotFoundError('x'), 'entity-not-found'],
		['ForbiddenError', new ForbiddenError('x'), 'access-denied'],
		['NotFoundError', new NotFoundError('x'), 'entity-not-found'],
		['ConflictError', new ConflictError('x'), 'blocked'],
		['UnprocessableRequestError', new UnprocessableRequestError('x'), 'blocked'],
		['BadRequestError', new BadRequestError('x'), 'validation'],
		['plain UserError', new UserError('x'), 'entity-not-found'],
		['unexpected error', new Error('boom'), 'validation'],
		['non-error thrown value', 'not an error object', 'validation'],
	])('%s -> %s', (_label, error, expectedReason) => {
		expect(classifyPackageFailure(error)).toBe(expectedReason);
	});
});
