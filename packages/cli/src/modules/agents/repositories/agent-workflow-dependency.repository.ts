import type { AgentJsonConfig, AgentJsonWorkflowToolConfig } from '@n8n/api-types';
import { BaseRepository, TransactionRunner, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager, type FindOptionsWhere } from '@n8n/typeorm';

import { AgentHistory } from '../entities/agent-history.entity';
import { AgentWorkflowDependency } from '../entities/agent-workflow-dependency.entity';
import { Agent } from '../entities/agent.entity';

export type AgentWorkflowDependencyReference = Pick<
	AgentWorkflowDependency,
	'agentId' | 'workflowId'
>;

function workflowToolRefs(
	schema: AgentJsonConfig | null | undefined,
): AgentJsonWorkflowToolConfig[] {
	return (schema?.tools ?? []).filter(
		(tool): tool is AgentJsonWorkflowToolConfig => tool.type === 'workflow',
	);
}

@Service()
export class AgentWorkflowDependencyRepository extends BaseRepository<AgentWorkflowDependency> {
	constructor(
		dataSource: DataSource,
		private readonly txRunner: TransactionRunner,
	) {
		super(AgentWorkflowDependency, dataSource.manager, txRunner);
	}

	async refreshForAgent(agentId: string): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			const manager = this.managerFor(ctx);
			const isPostgres = manager.connection.options.type === 'postgres';

			// Starting with a write serializes the authoritative re-read on SQLite.
			if (!isPostgres) {
				await manager.delete(AgentWorkflowDependency, { agentId });
			}

			const agent = isPostgres
				? await manager.findOne(Agent, {
						where: { id: agentId },
						lock: { mode: 'pessimistic_write' },
					})
				: await manager.findOne(Agent, { where: { id: agentId } });

			if (agent === null) {
				if (isPostgres) await manager.delete(AgentWorkflowDependency, { agentId });
				return;
			}

			const publishedVersion =
				agent.activeVersionId === null
					? null
					: await manager.findOne(AgentHistory, {
							where: { versionId: agent.activeVersionId, agentId },
						});
			// Only `schema.tools` carries workflow refs; integrations never do.
			const refs = [
				...workflowToolRefs(agent.schema),
				...workflowToolRefs(publishedVersion?.schema),
			];
			const workflowIds = [
				...new Set(refs.flatMap((ref) => (ref.workflowId === undefined ? [] : [ref.workflowId]))),
			];
			const legacyWorkflowNames = [
				...new Set(refs.flatMap((ref) => (ref.workflowId === undefined ? [ref.workflow] : []))),
			];

			const resolvedWorkflowIds = await this.resolveWorkflowIds(
				manager,
				agent.projectId,
				workflowIds,
				legacyWorkflowNames,
			);
			const existingWorkflowIds = isPostgres
				? await this.lockWorkflows(manager, resolvedWorkflowIds)
				: resolvedWorkflowIds;

			if (isPostgres) {
				await manager.delete(AgentWorkflowDependency, { agentId });
			}

			const rows = [...existingWorkflowIds].map((workflowId) => ({ agentId, workflowId }));

			if (rows.length > 0) {
				await manager.insert(AgentWorkflowDependency, rows);
			}
		});
	}

	async removeForAgent(agentId: string): Promise<void> {
		await this.managerFor({}).delete(AgentWorkflowDependency, { agentId });
	}

	async findByWorkflowIds(workflowIds: string[]): Promise<AgentWorkflowDependencyReference[]> {
		if (workflowIds.length === 0) return [];

		return await this.find({
			select: ['agentId', 'workflowId'],
			where: { workflowId: In(workflowIds) },
		});
	}

	/**
	 * Same resolution rule as `WorkflowRepository.findManyByAgentToolReferences`:
	 * refs resolve by id, legacy refs by name, both inside the agent's project.
	 */
	private async resolveWorkflowIds(
		manager: EntityManager,
		projectId: string,
		workflowIds: string[],
		legacyWorkflowNames: string[],
	): Promise<Set<string>> {
		const where: Array<FindOptionsWhere<WorkflowEntity>> = [];
		if (workflowIds.length > 0) {
			where.push({ id: In(workflowIds), shared: { projectId } });
		}
		if (legacyWorkflowNames.length > 0) {
			where.push({ name: In(legacyWorkflowNames), shared: { projectId } });
		}
		if (where.length === 0) return new Set();

		const workflows = await manager.find(WorkflowEntity, { where, select: ['id'] });
		return new Set(workflows.map(({ id }) => id));
	}

	private async lockWorkflows(
		manager: EntityManager,
		workflowIds: ReadonlySet<string>,
	): Promise<Set<string>> {
		if (workflowIds.size === 0) return new Set();

		const query = manager
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.select(['workflow.id'])
			.where('workflow.id IN (:...workflowIds)', { workflowIds: [...workflowIds] })
			.orderBy('workflow.id', 'ASC')
			.setLock('pessimistic_write');

		return new Set((await query.getMany()).map(({ id }) => id));
	}
}
