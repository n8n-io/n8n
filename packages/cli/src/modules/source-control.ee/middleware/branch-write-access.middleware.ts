import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';

/**
 * Creates a middleware that checks if the instance allows write operations.
 * Throws ForbiddenError if source control branch is in read-only mode.
 */
export const createBranchWriteAccessMiddleware =
	(resourceName: string): RequestHandler =>
	(_req, _res, next) => {
		const preferences = Container.get(SourceControlPreferencesService).getPreferences();
		if (preferences.branchReadOnly) {
			throw new ForbiddenError(
				`Cannot modify ${resourceName} on a protected instance. This instance is in read-only mode.`,
			);
		}
		next();
	};
