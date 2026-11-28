import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnprocessableRequestError,
	UserError,
} from '@n8n/errors';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
	PackageWorkflowInvalidError,
} from '../entities/package-export.errors';
import { classifyPackageFailure } from '../package-failure-classifier';
import { PreferenceImportError } from '../engine/preference-import.error';

describe('classifyPackageFailure', () => {
	test.each([
		['PackageEntityAccessDeniedError', new PackageEntityAccessDeniedError('x'), 'access-denied'],
		['PackageEntityNotFoundError', new PackageEntityNotFoundError('x'), 'entity-not-found'],
		['PackageExportBlockedError', new PackageExportBlockedError('x'), 'blocked'],
		[
			'PackageWorkflowInvalidError',
			new PackageWorkflowInvalidError('x', new Error()),
			'validation',
		],
		['ForbiddenError', new ForbiddenError('x'), 'access-denied'],
		['NotFoundError', new NotFoundError('x'), 'entity-not-found'],
		['ConflictError', new ConflictError('x'), 'blocked'],
		['partial import conflict', new PreferenceImportError(new ConflictError('x'), []), 'blocked'],
		[
			'partial import denial',
			new PreferenceImportError(new ForbiddenError('x'), []),
			'access-denied',
		],
		['UnprocessableRequestError', new UnprocessableRequestError('x'), 'blocked'],
		['BadRequestError', new BadRequestError('x'), 'validation'],
		['plain UserError', new UserError('x'), 'entity-not-found'],
		['unexpected error', new Error('boom'), 'validation'],
		['non-error thrown value', 'not an error object', 'validation'],
	])('%s -> %s', (_label, error, expectedReason) => {
		expect(classifyPackageFailure(error)).toBe(expectedReason);
	});
});
