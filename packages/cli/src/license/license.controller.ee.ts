/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import * as ResponseHelper from '@/ResponseHelper';
import { getLogger } from '@/Logger';
import { getLicense } from '@/License';
import { LicenseRequest } from '@/requests';

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

/**
 * POST /license/activate
 *
 * Activate license
 */
licenseController.post(
	'/activate',
	ResponseHelper.send(async (req: LicenseRequest.Activate): Promise<object | undefined> => {
		const activationKey = req.body.activationKey;
		if (!activationKey) {
			throw new ResponseHelper.ResponseError(`Activation key required`, undefined, 400);
		}

		try {
			const license = getLicense();

			await license.activate(activationKey);
			return license.getProductInfo();
		} catch (e: unknown) {
			if (e instanceof Error) {
				throw new ResponseHelper.ResponseError(e.message, undefined, 500);
			}

			return;
		}
	}),

	/*
	 * Renew license
	 */
	licenseController.post(
		'/renew',
		ResponseHelper.send(async (req: LicenseRequest.Activate): Promise<object | undefined> => {
			try {
				const license = getLicense();
				await license.renew();
				return license.getProductInfo();
			} catch (e: unknown) {
				if (e instanceof Error) {
					throw new ResponseHelper.ResponseError(e.message, undefined, 500);
				}

				return;
			}
		}),
	),
);
