import type { ListAgentsQueryDto, UpdateAgentsMcpAvailabilityDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ProjectScopeService } from '@/permissions.ee/project-scope.service';

import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

const BULK_CHUNK_SIZE = 500;

type BulkSetAvailableInMCPResult = {
	updatedCount: number;
	/** Only present when the request targeted explicit `agentIds`. */
	updatedIds?: string[];
	unchangedIds?: string[];
};

/**
 * Grants and revokes per-agent MCP availability (the `availableInMCP` flag),
 * mirroring the per-workflow flow in `McpSettingsService`. Project access is
 * resolved here because the REST routes have no project in their URL for a
 * `@ProjectScope` gate.
 */
@Service()
export class AgentMcpAccessService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	/**
	 * Paginated list of agents in projects where the user holds `agent:update`.
	 * Defaults to agents that are not yet available to MCP.
	 */
	async getAgents(
		user: User,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:update']);
		return await this.agentRepository.findByProjectIdsPaginated(
			projectIds,
			{
				...options,
				filter: {
					...options.filter,
					availableInMCP: options.filter?.availableInMCP ?? false,
				},
			},
			{ withProject: true },
		);
	}

	async bulkSetAvailableInMCP(
		user: User,
		dto: UpdateAgentsMcpAvailabilityDto,
	): Promise<BulkSetAvailableInMCPResult> {
		const targets = [dto.agentIds, dto.projectId, dto.allAgents].filter(
			(target) => target !== undefined,
		);
		if (targets.length !== 1) {
			throw new BadRequestError('Provide exactly one of "agentIds", "projectId", or "allAgents".');
		}

		const projectIds = await this.projectScopeService.getProjectIds(user, ['agent:update']);
		const allowedProjectIds = projectIds === null ? null : new Set(projectIds);
		if (dto.projectId && allowedProjectIds !== null && !allowedProjectIds.has(dto.projectId)) {
			return { updatedCount: 0 };
		}

		const candidates = await this.resolveCandidates(dto, projectIds);
		const accessible =
			allowedProjectIds === null
				? candidates
				: candidates.filter((agent) => allowedProjectIds.has(agent.projectId));

		const toUpdate = accessible.filter((agent) => agent.availableInMCP !== dto.availableInMCP);

		const agentIds = toUpdate.map((agent) => agent.id);
		for (let start = 0; start < agentIds.length; start += BULK_CHUNK_SIZE) {
			await this.agentRepository.setAvailableInMCP(
				agentIds.slice(start, start + BULK_CHUNK_SIZE),
				dto.availableInMCP,
			);
		}

		return {
			updatedCount: toUpdate.length,
			// Per-id breakdown only for explicit `agentIds` requests; the caller
			// uses it to confirm each requested agent landed in a known state.
			...(dto.agentIds
				? {
						updatedIds: agentIds,
						unchangedIds: accessible
							.filter((agent) => agent.availableInMCP === dto.availableInMCP)
							.map((agent) => agent.id),
					}
				: {}),
		};
	}

	private async resolveCandidates(
		dto: UpdateAgentsMcpAvailabilityDto,
		projectIds: string[] | null,
	): Promise<Array<Pick<Agent, 'id' | 'projectId' | 'availableInMCP'>>> {
		if (dto.agentIds) {
			return await this.agentRepository.findMcpAvailabilityCandidates({
				ids: [...new Set(dto.agentIds)],
			});
		}

		if (dto.projectId) {
			return await this.agentRepository.findMcpAvailabilityCandidates({
				projectIds: [dto.projectId],
			});
		}

		return await this.agentRepository.findMcpAvailabilityCandidates(
			projectIds === null ? { all: true } : { projectIds },
		);
	}
}
