/* eslint-disable no-param-reassign */

import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import * as ResponseHelper from '@/ResponseHelper';
import type { ILicensePostResponse, ILicenseReadResponse } from '@/Interfaces';
import { LicenseService } from './License.service';
import { License } from '@/License';
import type { AuthenticatedRequest, LicenseRequest } from '@/requests';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';

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
		if (!req.user.isOwner) {
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
		const license = Container.get(License);
		try {
			await license.activate(req.body.activationKey);
		} catch (e) {
			const error = e as Error & { errorId?: string };

			let message = 'Failed to activate license';

			//override specific error messages (to map License Server vocabulary to n8n terms)
			switch (error.errorId ?? 'UNSPECIFIED') {
				case 'SCHEMA_VALIDATION':
					message = 'Activation key is in the wrong format';
					break;
				case 'RESERVATION_EXHAUSTED':
					message =
						'Activation key has been used too many times. Please contact sales@n8n.io if you would like to extend it';
					break;
				case 'RESERVATION_EXPIRED':
					message = 'Activation key has expired';
					break;
				case 'NOT_FOUND':
				case 'RESERVATION_CONFLICT':
					message = 'Activation key not found';
					break;
				default:
					getLogger().error(message, { stack: error.stack ?? 'n/a' });
			}

			throw new ResponseHelper.BadRequestError(message);
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
		const license = Container.get(License);
		try {
			await license.renew();
		} catch (e) {
			const error = e as Error & { errorId?: string };

			// not awaiting so as not to make the endpoint hang
			void Container.get(InternalHooks).onLicenseRenewAttempt({ success: false });
			if (error instanceof Error) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
		}

		// not awaiting so as not to make the endpoint hang
		void Container.get(InternalHooks).onLicenseRenewAttempt({ success: true });

		// Return the read data, plus the management JWT
		return {
			managementToken: license.getManagementJwt(),
			...(await LicenseService.getLicenseData()),
		};
	}),
);
