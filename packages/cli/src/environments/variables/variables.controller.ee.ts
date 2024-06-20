import { VariablesRequest } from '@/requests';
import { Delete, Get, GlobalScope, Licensed, Patch, Post, RestController } from '@/decorators';
import { VariablesService } from './variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';

@RestController('/variables')
export class VariablesController {
	constructor(private readonly variablesService: VariablesService) {}

	@Get('/')
	@GlobalScope('variable:list')
	async getVariables() {
		return await this.variablesService.getAllCached();
	}

	@Post('/')
	@Licensed('feat:variables')
	@GlobalScope('variable:create')
	async createVariable(req: VariablesRequest.Create) {
		const variable = req.body;
		delete variable.id;
		try {
			return await this.variablesService.create(variable);
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
	@GlobalScope('variable:read')
	async getVariable(req: VariablesRequest.Get) {
		const id = req.params.id;
		const variable = await this.variablesService.getCached(id);
		if (variable === null) {
			throw new NotFoundError(`Variable with id ${req.params.id} not found`);
		}
		return variable;
	}

	@Patch('/:id')
	@Licensed('feat:variables')
	@GlobalScope('variable:update')
	async updateVariable(req: VariablesRequest.Update) {
		const id = req.params.id;
		const variable = req.body;
		delete variable.id;
		try {
			return await this.variablesService.update(id, variable);
		} catch (error) {
			if (error instanceof VariableCountLimitReachedError) {
				throw new BadRequestError(error.message);
			} else if (error instanceof VariableValidationError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Delete('/:id(\\w+)')
	@GlobalScope('variable:delete')
	async deleteVariable(req: VariablesRequest.Delete) {
		const id = req.params.id;
		await this.variablesService.delete(id);

		return true;
	}
}
