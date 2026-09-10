import {
	GLOBAL_PROJECT_ID_FILTER,
	ListVariablesQueryDto,
	VariableListPublicDto,
	type VariablePublic,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Variables } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	PublicApiController,
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
		value: variable.value,
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
}
