import type { RequestHandler } from 'express';
import { Container } from 'typedi';
import { isSourceControlLicensed } from '../sourceControlHelper.ee';
import { SourceControlPreferencesService } from '../sourceControlPreferences.service.ee';

export const sourceControlLicensedAndEnabledMiddleware: RequestHandler = (_req, res, next) => {
	const sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	if (sourceControlPreferencesService.isSourceControlLicensedAndEnabled()) {
		next();
	} else {
		if (!sourceControlPreferencesService.isSourceControlConnected()) {
			res.status(412).json({
				status: 'error',
				message: 'source_control_not_connected',
			});
		} else {
			res.status(401).json({ status: 'error', message: 'Unauthorized' });
		}
	}
};

export const sourceControlLicensedMiddleware: RequestHandler = (_req, res, next) => {
	if (isSourceControlLicensed()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
