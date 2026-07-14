import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from './entities/package-export.errors';
import type { PackageFailureReason } from './n8n-packages.types';

/**
 * Classifies a thrown error into the `reason` reported on the
 * `n8n.audit.n8n-package.<op>.failed` audit event.
 */
export function classifyPackageFailure(error: unknown): PackageFailureReason {
	if (error instanceof PackageEntityAccessDeniedError) return 'access-denied';
	if (error instanceof PackageEntityNotFoundError) return 'entity-not-found';
	if (error instanceof ForbiddenError) return 'access-denied';
	if (error instanceof NotFoundError) return 'entity-not-found';
	if (error instanceof ConflictError || error instanceof UnprocessableRequestError) {
		return 'blocked';
	}
	if (error instanceof BadRequestError) return 'validation';
	if (error instanceof UserError) return 'entity-not-found'; // e.g. folder not found in target project
	return 'validation';
}
