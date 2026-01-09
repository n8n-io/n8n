import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';

export const sourceControlEnabledMiddleware: RequestHandler = (_req, res, next) => {
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
