import { Container, Service } from 'typedi';

import { VariablesRequest } from '@/requests';
import { Authorized, Delete, Get, Licensed, Patch, Post, RestController } from '@/decorators';
import { VariablesService } from './variables.service.ee';
import { Logger } from '@/Logger';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';

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
			throw new UnauthorizedError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await Container.get(VariablesService).create(variable);
		} catch (error) {
			if (error instanceof VariableCountLimitReachedError) {
				throw new BadRequestError(error.message);
			} else if (error instanceof VariableValidationError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Get('/:id')
	async getVariable(req: VariablesRequest.Get) {
		const id = req.params.id;
		const variable = await Container.get(VariablesService).getCached(id);
		if (variable === null) {
			throw new NotFoundError(`Variable with id ${req.params.id} not found`);
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
			throw new UnauthorizedError('Unauthorized');
		}
		const variable = req.body;
		delete variable.id;
		try {
			return await Container.get(VariablesService).update(id, variable);
		} catch (error) {
			if (error instanceof VariableCountLimitReachedError) {
				throw new BadRequestError(error.message);
			} else if (error instanceof VariableValidationError) {
				throw new BadRequestError(error.message);
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
			throw new UnauthorizedError('Unauthorized');
		}
		await this.variablesService.delete(id);

		return true;
	}
}
