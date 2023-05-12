import type { RequestHandler } from 'express';
import { isVersionControlLicensed } from '../versionControlHelper';
import { VersionControlService } from '../versionControl.service.ee';
import Container from 'typedi';

export const versionControlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	const versionControlService = Container.get(VersionControlService);
	if (versionControlService.isVersionControlLicensedAndEnabled()) {
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
