import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { sendErrorResponse } from '@/response-helper';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

/**
 * Creates a middleware that checks if the instance allows write operations.
 * Sends a 403 Forbidden response if source control branch is in read-only mode.
 */
export const createBranchWriteAccessMiddleware =
	(resourceName: string): RequestHandler =>
	(_req, res, next) => {
		const preferences = Container.get(SourceControlPreferencesService).getPreferences();
		if (preferences.branchReadOnly) {
			sendErrorResponse(
				res,
				new ForbiddenError(
					`Cannot modify ${resourceName} on a protected instance. This instance is in read-only mode.`,
				),
			);
			return;
		}
		next();
	};
