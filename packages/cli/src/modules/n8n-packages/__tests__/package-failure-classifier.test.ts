import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnprocessableRequestError,
} from '@n8n/services-common';
import { UserError } from 'n8n-workflow';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '../entities/package-export.errors';
import { classifyPackageFailure } from '../package-failure-classifier';

describe('classifyPackageFailure', () => {
	test.each([
		['PackageEntityAccessDeniedError', new PackageEntityAccessDeniedError('x'), 'access-denied'],
		['PackageEntityNotFoundError', new PackageEntityNotFoundError('x'), 'entity-not-found'],
		['PackageExportBlockedError', new PackageExportBlockedError('x'), 'blocked'],
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
