import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import { getLogger } from '@/Logger';
import * as ResponseHelper from '@/ResponseHelper';
import type { VariablesRequest } from '@/requests';
import { VariablesService } from './variables.service';
import { EEVariablesController } from './variables.controller.ee';

export const variablesController = express.Router();

variablesController.use('/', EEVariablesController);

/**
 * Initialize Logger if needed
 */
variablesController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

variablesController.use(EEVariablesController);

variablesController.get(
	'/',
	ResponseHelper.send(async () => {
		return VariablesService.getAll();
	}),
);

variablesController.post(
	'/',
	ResponseHelper.send(async () => {
		throw new ResponseHelper.BadRequestError('No variables license found');
	}),
);

variablesController.get(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: VariablesRequest.Get) => {
		const id = parseInt(req.params.id);
		if (isNaN(id)) {
			throw new ResponseHelper.BadRequestError('Invalid variable id ' + req.params.id);
		}
		const variable = await VariablesService.get(id);
		if (variable === null) {
			throw new ResponseHelper.NotFoundError(`Variable with id ${req.params.id} not found`);
		}
		return variable;
	}),
);

variablesController.patch(
	'/:id(\\d+)',
	ResponseHelper.send(async () => {
		throw new ResponseHelper.BadRequestError('No variables license found');
	}),
);

variablesController.delete(
	'/:id(\\d+)',
	ResponseHelper.send(async (req: VariablesRequest.Delete) => {
		const id = parseInt(req.params.id);
		if (isNaN(id)) {
			throw new ResponseHelper.BadRequestError('Invalid variable id ' + req.params.id);
		}
		if (req.user.globalRole.name !== 'owner') {
			LoggerProxy.info('Attempt to delete a variable blocked due to lack of permissions', {
				id,
				userId: req.user.id,
			});
			throw new ResponseHelper.AuthError('Unauthorized');
		}
		await VariablesService.delete(id);

		return true;
	}),
);
