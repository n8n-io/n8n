import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '../entities/package-export.errors';
import { classifyPackageFailure } from '../package-failure-classifier';

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
