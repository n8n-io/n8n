import {
	CreateVariablePublicDto,
	GLOBAL_PROJECT_ID_FILTER,
	ListVariablesQueryDto,
	UpdateVariablePublicDto,
	VARIABLE_TYPE_DEFAULT,
	VariableListPublicDto,
	variableIdParamSchema,
	type VariablePublic,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Variables } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { toPublicProject } from '@/public-api/v1/shared/project.mapper';
import {
	paginateArray,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';

const tags = ['Variables'];

function toVariablePublic(variable: Variables): VariablePublic {
	return {
		id: variable.id,
		key: variable.key,
		// The `value` column allows `NULL` for a variable with no value. Represent
		// that as an empty string, matching how `state: 'empty'` already treats it.
		value: variable.value ?? '',
		type: variable.type,
		project: variable.project ? toPublicProject(variable.project) : null,
	};
}

@PublicApiController('/variables')
export class VariablesPublicController {
	constructor(private readonly variablesService: VariablesService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.VARIABLES)
	@ApiKeyScope('variable:list')
	@ApiSummary('Retrieve variables')
	@ApiDescription('Retrieve variables from your instance.')
	@ApiTags(tags)
	@ApiResponse(200, VariableListPublicDto)
	async getVariables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListVariablesQueryDto,
	): Promise<VariableListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);
		const { projectId, state } = query;

		const variables = await this.variablesService.getAllForUser(req.user, {
			state,
			projectId: projectId === GLOBAL_PROJECT_ID_FILTER ? null : projectId,
		});

		const { data, nextCursor } = paginateArray(variables, { offset, limit });

		return { data: data.map(toVariablePublic), nextCursor };
	}

	@Post('/')
	@Licensed(LICENSE_FEATURES.VARIABLES)
	@ApiKeyScope('variable:create')
	@ApiSummary('Create a variable')
	@ApiDescription('Create a variable in your instance.')
	@ApiTags(tags)
	@ApiResponse(201)
	async createVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateVariablePublicDto,
	): Promise<void> {
		const { key, value, projectId } = payload;

		await this.variablesService.create(req.user, {
			key,
			value,
			// The public spec marks `type` read-only, so the caller never sends it.
			type: VARIABLE_TYPE_DEFAULT,
			projectId,
		});
	}

	@Put('/:id')
	@Licensed(LICENSE_FEATURES.VARIABLES)
	@ApiKeyScope('variable:update')
	@ApiSummary('Update a variable')
	@ApiDescription('Update a variable from your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async updateVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', variableIdParamSchema) id: string,
		@Body payload: UpdateVariablePublicDto,
	): Promise<void> {
		const { key, value, projectId } = payload;

		await this.variablesService.update(req.user, id, {
			key,
			value,
			projectId,
		});
	}

	@Delete('/:id')
	@Licensed(LICENSE_FEATURES.VARIABLES)
	@ApiKeyScope('variable:delete')
	@ApiSummary('Delete a variable')
	@ApiDescription('Delete a variable from your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteVariable(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id', variableIdParamSchema) id: string,
	): Promise<void> {
		await this.variablesService.deleteForUser(req.user, id);
	}
}
