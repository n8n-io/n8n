import { BadRequestError, ConflictError, ForbiddenError } from '@n8n/errors';

import { PackageExportBlockedError } from '../../entities/package-export.errors';
import { classifyWorkflowPackageFailure } from '../workflow-package-failure';

describe('classifyWorkflowPackageFailure', () => {
	it.each([
		[new ForbiddenError('No access'), 'access-denied'],
		[new ConflictError('Lineage conflict'), 'blocked'],
		[new BadRequestError('Not base64'), 'validation'],
		[new PackageExportBlockedError('Too large'), 'blocked'],
	] as const)('classifies errors as the package service does (%s)', (error, expected) => {
		expect(classifyWorkflowPackageFailure(error)).toBe(expected);
	});

	it('takes the reason that the surface gives for its own error', () => {
		const surfaceError = new Error('Kept out of this surface');
		const classifySurfaceFailure = (error: unknown) =>
			error === surfaceError ? ('access-denied' as const) : undefined;

		expect(classifyWorkflowPackageFailure(surfaceError, classifySurfaceFailure)).toBe(
			'access-denied',
		);
		expect(
			classifyWorkflowPackageFailure(new ConflictError('Lineage conflict'), classifySurfaceFailure),
		).toBe('blocked');
	});
});
