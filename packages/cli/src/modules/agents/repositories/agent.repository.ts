import { isAgentCredentialIntegration } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { Agent } from '../entities/agent.entity';

@Service()
export class AgentRepository extends Repository<Agent> {
	constructor(dataSource: DataSource) {
		super(Agent, dataSource.manager);
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.find({
			where: { projectId },
			relations: { publishedVersion: true },
			order: { updatedAt: 'DESC' },
		});
	}

	/**
	 * Finds an agent by ID and project ID, eagerly loading its `publishedVersion` relation.
	 *
	 * TypeORM does not load relations by default — without `relations: { publishedVersion: true }`,
	 * `agent.publishedVersion` would always be `undefined` even if a row exists in
	 * `agent_published_version`. The eager load is needed so the frontend receives the full
	 * published snapshot (or `null`) in a single query, which is what the publish button uses
	 * to compute its state (published vs. unpublished, has changes vs. up to date).
	 */
	async findByIdAndProjectId(id: string, projectId: string): Promise<Agent | null> {
		return await this.findOne({
			where: { id, projectId },
			relations: { publishedVersion: true },
		});
	}

	async findPublished(): Promise<Agent[]> {
		return await this.createQueryBuilder('agent')
			.innerJoinAndSelect('agent.publishedVersion', 'publishedVersion')
			.getMany();
	}

	/**
	 * Finds agents within a project whose `integrations` JSON column contains an
	 * entry matching the given `type` + `credentialId`, excluding `excludeAgentId`.
	 *
	 * Scoped to a single project because credentials are project-scoped in n8n —
	 * an agent can only use credentials from its own project, so conflicts can
	 * only occur between agents in the same project.
	 *
	 * Filters in memory because `integrations` is a JSON column with no portable
	 * SQL query across SQLite/Postgres/MySQL. Agent counts per project are small
	 * enough that this is fine.
	 */
	async findByIntegrationCredential(
		type: string,
		credentialId: string,
		projectId: string,
		excludeAgentId: string,
	): Promise<Agent[]> {
		const agents = await this.find({ where: { projectId } });
		return agents.filter(
			(agent) =>
				agent.id !== excludeAgentId &&
				(agent.integrations ?? []).some(
					(i) =>
						isAgentCredentialIntegration(i) && i.type === type && i.credentialId === credentialId,
				),
		);
	}
}
