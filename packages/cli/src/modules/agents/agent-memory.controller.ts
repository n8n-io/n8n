import { ListAgentMemoryEntriesQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AgentMemoryEntriesService } from './agent-memory-entries.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentMemoryController {
	constructor(private readonly agentMemoryEntriesService: AgentMemoryEntriesService) {}

	@Get('/:agentId/memory-entries')
	@ProjectScope('agent:read')
	async listMemoryEntries(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Query query: ListAgentMemoryEntriesQueryDto,
	) {
		return await this.agentMemoryEntriesService.list(agentId, projectId, req.user, query);
	}

	@Get('/:agentId/memory-entries/facets')
	@ProjectScope('agent:read')
	async listMemorySourceFacets(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	) {
		return await this.agentMemoryEntriesService.listSourceFacets(agentId, projectId, req.user.id);
	}

	@Delete('/:agentId/memory-entries/:entryId')
	@ProjectScope('agent:update')
	async deleteMemoryEntry(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Param('entryId') entryId: string,
	) {
		await this.agentMemoryEntriesService.delete(agentId, projectId, entryId);
		return { success: true };
	}
}
