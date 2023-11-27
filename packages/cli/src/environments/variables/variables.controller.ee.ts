import { Container, Service } from 'typedi';

import * as ResponseHelper from '@/ResponseHelper';
import { VariablesRequest } from '@/requests';
import { Authorized, Delete, Get, Licensed, Patch, Post, RestController } from '@/decorators';
import {
	VariablesService,
	VariablesLicenseError,
	VariablesValidationError,
} from './variables.service.ee';
import { Logger } from '@/Logger';

@Service()
@Authorized()
@RestController('/variables')
export class VariablesController {
	constructor(
		private variablesService: VariablesService,
		private logger: Logger,
	) {}

	@Get('/')
	async getVariables() {
		return Container.get(VariablesService).getAllCached();
	}

	@Post('/')
	@Licensed('feat:variables')
	async createVariable(req: VariablesRequest.Create) {
		if (req.user.globalRole.name !== 'owner') {
			this.logger.info('Attempt to update a variable blocked due to lack of permissions', {
				userId: req.user.id,
			});
			throw new ResponseHelper.UnauthorizedError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await Container.get(VariablesService).create(variable);
		} catch (error) {
			if (error instanceof VariablesLicenseError) {
				throw new ResponseHelper.BadRequestError(error.message);
			} else if (error instanceof VariablesValidationError) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Get('/:id')
	async getVariable(req: VariablesRequest.Get) {
		const id = req.params.id;
		const variable = await Container.get(VariablesService).getCached(id);
		if (variable === null) {
			throw new ResponseHelper.NotFoundError(`Variable with id ${req.params.id} not found`);
		}
		return variable;
	}

	@Patch('/:id')
	@Licensed('feat:variables')
	async updateVariable(req: VariablesRequest.Update) {
		const id = req.params.id;
		if (req.user.globalRole.name !== 'owner') {
			this.logger.info('Attempt to update a variable blocked due to lack of permissions', {
				id,
				userId: req.user.id,
			});
			throw new ResponseHelper.UnauthorizedError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await Container.get(VariablesService).update(id, variable);
		} catch (error) {
			if (error instanceof VariablesLicenseError) {
				throw new ResponseHelper.BadRequestError(error.message);
			} else if (error instanceof VariablesValidationError) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Delete('/:id')
	async deleteVariable(req: VariablesRequest.Delete) {
		const id = req.params.id;
		if (req.user.globalRole.name !== 'owner') {
			this.logger.info('Attempt to delete a variable blocked due to lack of permissions', {
				id,
				userId: req.user.id,
			});
			throw new ResponseHelper.UnauthorizedError('Unauthorized');
		}
		await this.variablesService.delete(id);

		return true;
	}
}
