import type { RequestHandler } from 'express';
import { isVersionControlLicensed } from '../versionControlHelper';
import Container from 'typedi';
import { VersionControlPreferencesService } from '../versionControlPreferences.service';

export const versionControlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	const versionControlPreferencesService = Container.get(VersionControlPreferencesService);
	if (versionControlPreferencesService.isVersionControlLicensedAndEnabled()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const versionControlLicensedMiddleware: RequestHandler = (req, res, next) => {
	if (isVersionControlLicensed()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
