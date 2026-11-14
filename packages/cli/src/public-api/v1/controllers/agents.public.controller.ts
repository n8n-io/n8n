import { DeletedAgentPublicDto, agentIdParamSchema } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Delete,
	Param,
	ProjectScope,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';
import type { DeletedAgentSnapshot } from '@/modules/agents/agents.service';
import { AgentsService } from '@/modules/agents/agents.service';

@PublicApiController('/agents')
export class AgentsPublicController {
	constructor(private readonly agentsService: AgentsService) {}

	@Delete('/:agentId')
	@ApiKeyScope('agent:delete')
	@ProjectScope('agent:delete')
	@ApiSummary('Delete an agent')
	@ApiDescription(
		'Delete an agent and its associated resources. The agent is deleted right away: ' +
			'it does not need to be archived first, and a published agent with live channels is ' +
			'deleted too. This matches the workflow delete endpoint.',
	)
	@ApiTags(['Agent'])
	@ApiResponse(200, DeletedAgentPublicDto)
	@ApiErrorResponse(404)
	async deleteAgent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId', agentIdParamSchema) agentId: string,
	): Promise<DeletedAgentPublicDto> {
		const deleted = await this.agentsService.delete(agentId);

		if (!deleted) {
			// the user cannot see this agent, or it does not exist
			throw new NotFoundError('Not Found');
		}

		return this.toDeletedAgentPublicDto(deleted);
	}

	private toDeletedAgentPublicDto(agent: DeletedAgentSnapshot): DeletedAgentPublicDto {
		return {
			id: agent.id,
			name: agent.name,
			projectId: agent.projectId,
			availableInMCP: agent.availableInMCP,
			versionId: agent.versionId,
			activeVersionId: agent.activeVersionId,
			createdAt: toIsoTimestamp(agent.createdAt),
			updatedAt: toIsoTimestamp(agent.updatedAt),
		};
	}
}

function toIsoTimestamp(value: Date | string | undefined): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string' && value.length > 0) return value;
	return new Date(0).toISOString();
}
