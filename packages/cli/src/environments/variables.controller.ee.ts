import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import * as ResponseHelper from '@/ResponseHelper';
import type { VariablesRequest } from '@/requests';
import {
	VariablesLicenseError,
	EEVariablesService,
	VariablesValidationError,
} from './variables.service.ee';
import { isVariablesEnabled } from './enviromentHelpers';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EEVariablesController = express.Router();

/**
 * Initialize Logger if needed
 */
EEVariablesController.use((req, res, next) => {
	if (!isVariablesEnabled()) {
		next('router');
		return;
	}

	next();
});

EEVariablesController.post(
	'/',
	ResponseHelper.send(async (req: VariablesRequest.Create) => {
		if (req.user.globalRole.name !== 'owner') {
			LoggerProxy.info('Attempt to update a variable blocked due to lack of permissions', {
				userId: req.user.id,
			});
			throw new ResponseHelper.AuthError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await EEVariablesService.create(variable);
		} catch (error) {
			if (error instanceof VariablesLicenseError) {
				throw new ResponseHelper.BadRequestError(error.message);
			} else if (error instanceof VariablesValidationError) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
			throw error;
		}
	}),
);

EEVariablesController.patch(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: VariablesRequest.Update) => {
		const id = parseInt(req.params.id);
		if (isNaN(id)) {
			throw new ResponseHelper.BadRequestError('Invalid variable id ' + req.params.id);
		}
		if (req.user.globalRole.name !== 'owner') {
			LoggerProxy.info('Attempt to update a variable blocked due to lack of permissions', {
				id,
				userId: req.user.id,
			});
			throw new ResponseHelper.AuthError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await EEVariablesService.update(id, variable);
		} catch (error) {
			if (error instanceof VariablesLicenseError) {
				throw new ResponseHelper.BadRequestError(error.message);
			} else if (error instanceof VariablesValidationError) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
			throw error;
		}
	}),
);
