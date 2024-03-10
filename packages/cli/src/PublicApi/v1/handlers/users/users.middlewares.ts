/* eslint-disable @typescript-eslint/no-invalid-void-type */

import type express from 'express';
import { Container } from 'typedi';

import { License } from '@/License';
import type { UserRequest } from '@/requests';

export const validUserRole = (
	req: UserRequest.Create,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	if (req.body.role === 'global:owner') {
		return res.status(400).json({ message: 'req.body.role cannot be global:owner' });
	}

	const license = Container.get(License);
	if (req.body.role === 'global:admin' && !license.isAdvancedPermissionsLicensed()) {
		return res.status(400).json({
			message:
				'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
		});
	}

	if (!['global:admin', 'global:member'].includes(req.body.role)) {
		return res.status(400).json({ message: 'req.body.role is not a known role' });
	}

	return next();
};
