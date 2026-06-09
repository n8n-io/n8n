import { Container } from '@n8n/di';
import type { RequestHandler } from 'express';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';

export const sourceControlEnabledMiddleware: RequestHandler = async (_req, res, next) => {
	const sourceControlPreferencesService = Container.get(SourceControlPreferencesService);

	if (!sourceControlPreferencesService.isSourceControlConnected()) {
		try {
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
		} catch {
			// Keep returning source_control_not_connected if preferences cannot be reloaded.
		}
	}

	if (sourceControlPreferencesService.isSourceControlConnected()) {
		next();
	} else {
		res.status(412).json({
			status: 'error',
			message: 'source_control_not_connected',
		});
	}
};
