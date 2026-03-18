import type { RequestHandler } from 'express';

import { createBranchWriteAccessMiddleware } from '@/modules/source-control.ee/middleware/branch-write-access.middleware';

/**
 * Middleware that checks if the instance allows write operations on data tables.
 * Throws ForbiddenError if source control branch is in read-only mode.
 */
export const branchWriteAccessMiddleware: RequestHandler =
	createBranchWriteAccessMiddleware('data tables');
