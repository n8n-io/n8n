import { CreateVariableRequestDto, UpdateVariableRequestDto } from '@n8n/api-types';

import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Patch,
	Post,
	RestController,
} from '@/decorators';
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
	@GlobalScope('variable:list')
	async getVariables() {
		return await this.variablesService.getAllCached();
	}

	@Post('/')
	@Licensed('feat:variables')
	@GlobalScope('variable:create')
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

	@Get('/:id')
	@GlobalScope('variable:read')
	async getVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('variableId') variableId: string,
	) {
		const variable = await this.variablesService.getCached(variableId);
		if (variable === null) {
			throw new NotFoundError(`Variable with id ${variableId} not found`);
		}
		return variable;
	}

	@Patch('/:variableId')
	@Licensed('feat:variables')
	@GlobalScope('variable:update')
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
	@GlobalScope('variable:delete')
	async deleteVariable(req: VariablesRequest.Delete) {
		const id = req.params.id;
		await this.variablesService.delete(id);

		return true;
	}
}
