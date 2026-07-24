import type { ListAgentsQueryDto, UpdateAgentsMcpAvailabilityDto } from '@n8n/api-types';
import { ProjectRelationRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

type BulkSetAvailableInMCPResult = {
	updatedCount: number;
	unchangedCount: number;
	skippedCount: number;
	failedCount: number;
	/** Only present when the request targeted explicit `agentIds`. */
	updatedIds?: string[];
	unchangedIds?: string[];
};

/**
 * Grants and revokes per-agent MCP availability (the `availableInMCP` flag),
 * mirroring the per-workflow flow in `McpSettingsService`. Permission checks
 * happen here — per project, against the `agent:update` scope — because the
 * REST routes have no project in their URL for a `@ProjectScope` gate.
 */
@Service()
export class AgentMcpAccessService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
	) {}

	/**
	 * Paginated list of agents the user may expose to MCP (not yet available,
	 * in projects where the user holds `agent:update`).
	 */
	async getEligibleAgents(
		user: User,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		const projectIds = await this.getProjectIdsWithUpdateScope(user);
		return await this.agentRepository.findByProjectIdsPaginated(projectIds, {
			...options,
			filter: { ...options.filter, availableInMCP: false },
		});
	}

	async bulkSetAvailableInMCP(
		user: User,
		dto: UpdateAgentsMcpAvailabilityDto,
	): Promise<BulkSetAvailableInMCPResult> {
		const targets = [dto.agentIds, dto.projectId, dto.allAgents].filter(
			(target) => target !== undefined,
		);
		if (targets.length !== 1) {
			throw new BadRequestError(
				'Provide exactly one of "agentIds", "projectId", or "allAgents".',
			);
		}

		const candidates = await this.resolveCandidates(user, dto);
		const allowedProjectIds = await this.filterProjectIdsByUpdateScope(user, [
			...new Set(candidates.map((agent) => agent.projectId)),
		]);

		const accessible = candidates.filter((agent) => allowedProjectIds.has(agent.projectId));
		const skippedCount = candidates.length - accessible.length;

		const unchanged = accessible.filter((agent) => agent.availableInMCP === dto.availableInMCP);
		const toUpdate = accessible.filter((agent) => agent.availableInMCP !== dto.availableInMCP);

		await this.agentRepository.setAvailableInMCP(
			toUpdate.map((agent) => agent.id),
			dto.availableInMCP,
		);

		return {
			updatedCount: toUpdate.length,
			unchangedCount: unchanged.length,
			skippedCount,
			failedCount: 0,
			...(dto.agentIds
				? {
						updatedIds: toUpdate.map((agent) => agent.id),
						unchangedIds: unchanged.map((agent) => agent.id),
					}
				: {}),
		};
	}

	private async resolveCandidates(
		user: User,
		dto: UpdateAgentsMcpAvailabilityDto,
	): Promise<Array<Pick<Agent, 'id' | 'projectId' | 'availableInMCP'>>> {
		if (dto.agentIds) {
			return await this.agentRepository.findMcpAvailabilityCandidates({
				ids: [...new Set(dto.agentIds)],
			});
		}

		const projectIds = dto.projectId
			? [dto.projectId]
			: (await this.projectRelationRepository.findAllByUser(user.id)).map((pr) => pr.projectId);

		return await this.agentRepository.findMcpAvailabilityCandidates({ projectIds });
	}

	private async getProjectIdsWithUpdateScope(user: User): Promise<string[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(user.id);
		const projectIds = [...new Set(projectRelations.map((pr) => pr.projectId))];
		return [...(await this.filterProjectIdsByUpdateScope(user, projectIds))];
	}

	private async filterProjectIdsByUpdateScope(
		user: User,
		projectIds: string[],
	): Promise<Set<string>> {
		const allowed = await Promise.all(
			projectIds.map(
				async (projectId) => await userHasScopes(user, ['agent:update'], false, { projectId }),
			),
		);
		return new Set(projectIds.filter((_, index) => allowed[index]));
	}
}
