import { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';

import { Body, Delete, Get, Licensed, Patch, Post, RestController } from '@/decorators';
import { Param } from '@/decorators/args';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { AuthenticatedRequest, VariablesRequest } from '@/requests';

import { VariablesService } from './variables.service.ee';

@RestController('/variables')
export class VariablesController {
	constructor(private readonly variablesService: VariablesService) {}

	@Get('/')
	async getVariables(req: AuthenticatedRequest) {
		return await this.variablesService.getAllForUser(req.user);
	}

	@Post('/')
	@Licensed('feat:variables')
	async createVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Body variable: CreateVariableRequestDto,
	) {
		try {
			return await this.variablesService.create(variable, req.user);
		} catch (error) {
			if (error instanceof VariableCountLimitReachedError) {
				throw new BadRequestError(error.message);
			} else if (error instanceof VariableValidationError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}

	@Get('/:variableId')
	async getVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('variableId') variableId: string,
	) {
		const variable = await this.variablesService.getForUser(variableId, req.user);
		if (variable === null) {
			throw new NotFoundError(`Variable with id ${variableId} not found`);
		}
		return variable;
	}

	@Patch('/:variableId')
	@Licensed('feat:variables')
	async updateVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('variableId') variableId: string,
		@Body variable: UpdateVariableRequestDto,
	) {
		try {
			return await this.variablesService.update(variableId, variable, req.user);
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
		await this.variablesService.delete(id, req.user);

		return true;
	}
}
