import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';
import { ConflictError } from '@/errors/response-errors/conflict.error.js';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error.js';
import { NotFoundError } from '@/errors/response-errors/not-found.error.js';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error.js';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from './entities/package-export.errors.js';
import type { PackageFailureReason } from './n8n-packages.types.js';

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
