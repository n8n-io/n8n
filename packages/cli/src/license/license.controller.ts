/* eslint-disable no-param-reassign */

import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import {
	ILicensePostResponse,
	ILicenseReadResponse,
	InternalHooksManager,
	ResponseHelper,
} from '..';
import { LicenseService } from './License.service';
import { getLicense } from '@/License';
import { AuthenticatedRequest, LicenseRequest } from '@/requests';
import { isInstanceOwner } from '@/PublicApi/v1/handlers/users/users.service';

export const licenseController = express.Router();

const OWNER_ROUTES = ['/activate', '/renew'];

/**
 * Initialize Logger if needed
 */
licenseController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

/**
 * Owner checking
 */
licenseController.use((req: AuthenticatedRequest, res, next) => {
	if (OWNER_ROUTES.includes(req.path) && req.user) {
		if (!isInstanceOwner(req.user)) {
			LoggerProxy.info('Non-owner attempted to activate or renew a license', {
				userId: req.user.id,
			});
			ResponseHelper.sendErrorResponse(
				res,
				new ResponseHelper.UnauthorizedError(
					'Only an instance owner may activate or renew a license',
				),
			);
			return;
		}
	}
	next();
});

/**
 * GET /license
 * Get the license data, usable by everyone
 */
licenseController.get(
	'/',
	ResponseHelper.send(async (): Promise<ILicenseReadResponse> => {
		return LicenseService.getLicenseData();
	}),
);

/**
 * POST /license/activate
 * Only usable by the instance owner, activates a license.
 */
licenseController.post(
	'/activate',
	ResponseHelper.send(async (req: LicenseRequest.Activate): Promise<ILicensePostResponse> => {
		// Call the license manager activate function and tell it to throw an error
		const license = getLicense();
		try {
			await license.activate(req.body.activationKey);
		} catch (e) {
			if (e instanceof Error) {
				throw new ResponseHelper.BadRequestError(e.message);
			}
		}

		// Return the read data, plus the management JWT
		return {
			managementToken: license.getManagementJwt(),
			...(await LicenseService.getLicenseData()),
		};
	}),
);

/**
 * POST /license/renew
 * Only usable by instance owner, renews a license
 */
licenseController.post(
	'/renew',
	ResponseHelper.send(async (): Promise<ILicensePostResponse> => {
		// Call the license manager activate function and tell it to throw an error
		const license = getLicense();
		try {
			await license.renew();
		} catch (e) {
			await InternalHooksManager.getInstance().onLicenseRenewAttempt({ success: false });
			if (e instanceof Error) {
				throw new ResponseHelper.BadRequestError(e.message);
			}
		}

		// Return the read data, plus the management JWT
		await InternalHooksManager.getInstance().onLicenseRenewAttempt({ success: true });
		return {
			managementToken: license.getManagementJwt(),
			...(await LicenseService.getLicenseData()),
		};
	}),
);
