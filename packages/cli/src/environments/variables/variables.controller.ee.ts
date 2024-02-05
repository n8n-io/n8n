import { VariablesRequest } from '@/requests';
import {
	Authorized,
	Delete,
	Get,
	Licensed,
	Patch,
	Post,
	RestController,
	Scoped,
} from '@/decorators';
import { VariablesService } from './variables.service.ee';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { VariableValidationError } from '@/errors/variable-validation.error';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';

@Authorized()
@RestController('/variables')
export class VariablesController {
	constructor(private readonly variablesService: VariablesService) {}

	@Get('/')
	@Scoped('variable:list', { globalOnly: true })
	async getVariables() {
		return await this.variablesService.getAllCached();
	}

	@Post('/')
	@Licensed('feat:variables')
	@Scoped('variable:create', { globalOnly: true })
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
	@Scoped('variable:read', { globalOnly: true })
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
	@Scoped('variable:update', { globalOnly: true })
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
	@Scoped('variable:delete', { globalOnly: true })
	async deleteVariable(req: VariablesRequest.Delete) {
		const id = req.params.id;
		await this.variablesService.delete(id);

		return true;
	}
}
