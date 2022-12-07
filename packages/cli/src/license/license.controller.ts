/* eslint-disable no-param-reassign */

import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import { ResponseHelper } from '..';
import { LicenseService } from './License.service';
import { getLicense, License } from '@/License';

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
	'/',
	ResponseHelper.send(async () => {
		const triggerCount = await LicenseService.getActiveTriggerCount();

		const features = getLicense().getFeatures();

		return {
			usage: {
				executions: {
					value: triggerCount,
					limit: -1,
					warningThreshold: 0.8,
				},
				features,
			},
		};
	}),
);
