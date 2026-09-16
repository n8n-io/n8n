import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';

/**
 * Middleware that checks if the instance allows write operations.
 * Throws ForbiddenError if source control branch is in read-only mode.
 */
export const branchWriteAccessMiddleware: RequestHandler = (_req, _res, next) => {
	if (Container.get(InstanceWriteAccessService).isReadOnly()) {
		throw new ForbiddenError(
			'Cannot modify data tables on a protected instance. This instance is in read-only mode.',
		);
	}
	next();
};
