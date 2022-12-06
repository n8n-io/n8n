/* eslint-disable no-param-reassign */

import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import { ResponseHelper } from '..';
import { LicenseService } from './License.service';

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

licenseController.get(
	'/quota',
	ResponseHelper.send(async () => {
		const triggerCount = await LicenseService.getActiveTriggerCount();
		return {
			triggerCount,
		};
	}),
);
