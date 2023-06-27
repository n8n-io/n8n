import type { RequestHandler } from 'express';
import { isSourceControlLicensed } from '../sourceControlHelper.ee';
import Container from 'typedi';
import { SourceControlPreferencesService } from '../sourceControlPreferences.service.ee';

export const sourceControlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	const sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	if (sourceControlPreferencesService.isSourceControlLicensedAndEnabled()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const sourceControlLicensedMiddleware: RequestHandler = (req, res, next) => {
	if (isSourceControlLicensed()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
