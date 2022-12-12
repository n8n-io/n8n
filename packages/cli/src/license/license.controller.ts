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
import { LicenseRequest } from '@/requests';
import { isInstanceOwner } from '@/PublicApi/v1/handlers/users/users.service';

export const licenseController = express.Router();

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

// Helper for getting the basic license data that we want to return
async function getLicenseData(): Promise<ILicenseReadResponse> {
	const triggerCount = await LicenseService.getActiveTriggerCount();
	const license = getLicense();
	const mainPlan = license.getMainPlan();

	return {
		usage: {
			executions: {
				value: triggerCount,
				limit: license.getTriggerLimit(),
				warningThreshold: 0.8,
			},
		},
		license: {
			planId: mainPlan?.productId ?? '',
			planName: license.getPlanName(),
		},
	};
}

/**
 * GET /license
 * Get the license data, usable by everyone
 */
licenseController.get(
	'/',
	ResponseHelper.send(async (): Promise<ILicenseReadResponse> => {
		return getLicenseData();
	}),
);

/**
 * POST /license/activate
 * Only usable by the instance owner, activates a license.
 */
licenseController.post(
	'/activate',
	ResponseHelper.send(async (req: LicenseRequest.Activate): Promise<ILicensePostResponse> => {
		// First ensure that the requesting user is the instance owner
		if (!isInstanceOwner(req.user)) {
			LoggerProxy.info('Non-owner attempted to activate a license', {
				userId: req.user.id,
			});
			throw new ResponseHelper.NotFoundError('Only an instance owner may activate a license');
		}

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
			...(await getLicenseData()),
		};
	}),
);

/**
 * POST /license/renew
 * Only usable by instance owner, renews a license
 */
licenseController.post(
	'/renew',
	ResponseHelper.send(async (req: LicenseRequest.Renew): Promise<ILicensePostResponse> => {
		// First ensure that the requesting user is the instance owner
		if (!isInstanceOwner(req.user)) {
			LoggerProxy.info('Non-owner attempted to renew a license', {
				userId: req.user.id,
			});
			await InternalHooksManager.getInstance().onLicenseRenewAttempt({ success: false });
			throw new ResponseHelper.NotFoundError('Only an instance owner may renew a license');
		}

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
			...(await getLicenseData()),
		};
	}),
);
