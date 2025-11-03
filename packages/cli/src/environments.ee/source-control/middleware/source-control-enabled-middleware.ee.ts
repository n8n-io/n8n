import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';

/**
 * Middleware to check if source control is connected (checks Git connection)
 * Replaces the old license-based middleware
 */
export const sourceControlConnectedMiddleware: RequestHandler = (_req, res, next) => {
	const sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	if (sourceControlPreferencesService.isSourceControlConnected()) {
		next();
	} else {
		res.status(412).json({
			status: 'error',
			message: 'source_control_not_connected',
		});
	}
};

/**
 * @deprecated Use sourceControlConnectedMiddleware instead
 * Kept for backward compatibility during migration
 */
export const sourceControlLicensedAndEnabledMiddleware: RequestHandler =
	sourceControlConnectedMiddleware;

/**
 * @deprecated License checks removed - this is now a no-op
 * All endpoints are accessible without license checks
 */
export const sourceControlLicensedMiddleware: RequestHandler = (_req, _res, next) => {
	next();
};
