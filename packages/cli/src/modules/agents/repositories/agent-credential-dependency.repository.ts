import {
	BaseRepository,
	CredentialsEntity,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type EntityManager } from '@n8n/typeorm';

import { AgentCredentialDependency } from '../entities/agent-credential-dependency.entity';
import { AgentHistory } from '../entities/agent-history.entity';
import { Agent } from '../entities/agent.entity';
import { extractAgentCredentialIds } from '../utils/extract-agent-credential-ids';

export type AgentCredentialDependencyReference = Pick<
	AgentCredentialDependency,
	'agentId' | 'credentialId'
>;

class AgentCredentialDependencyTable extends BaseRepository<AgentCredentialDependency> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentCredentialDependency, dataSource.manager, transactionRunner);
	}
}

@Service()
export class AgentCredentialDependencyRepository {
	private readonly table: AgentCredentialDependencyTable;

	constructor(
		dataSource: DataSource,
		private readonly txRunner: TransactionRunner,
	) {
		this.table = new AgentCredentialDependencyTable(dataSource, txRunner);
	}

	async refreshForAgent(agentId: string, ctx: OperationContext): Promise<void> {
		await this.txRunner.run(ctx, async (ctx) => {
			const manager = this.table.managerFor(ctx);
			const isPostgres = manager.connection.options.type === 'postgres';

			// Starting with a write serializes the authoritative re-read on SQLite.
			if (!isPostgres) {
				await manager.delete(AgentCredentialDependency, { agentId });
			}

			const agent = isPostgres
				? await manager.findOne(Agent, {
						where: { id: agentId },
						lock: { mode: 'pessimistic_write' },
					})
				: await manager.findOne(Agent, { where: { id: agentId } });

			if (agent === null) {
				if (isPostgres) await manager.delete(AgentCredentialDependency, { agentId });
				return;
			}

			const publishedVersion =
				agent.activeVersionId === null
					? null
					: await manager.findOne(AgentHistory, {
							where: { versionId: agent.activeVersionId, agentId },
						});
			const draftCredentialIds = extractAgentCredentialIds({
				...agent.schema,
				integrations: agent.integrations,
			});
			const publishedCredentialIds = extractAgentCredentialIds(publishedVersion?.schema);
			const referencedCredentialIds = new Set([...draftCredentialIds, ...publishedCredentialIds]);

			const existingCredentialIds = await this.findExistingCredentialIds(
				manager,
				referencedCredentialIds,
				isPostgres,
			);

			if (isPostgres) {
				await manager.delete(AgentCredentialDependency, { agentId });
			}

			const rows = [...referencedCredentialIds]
				.filter((credentialId) => existingCredentialIds.has(credentialId))
				.map((credentialId) => ({ agentId, credentialId }));

			if (rows.length > 0) {
				await manager.insert(AgentCredentialDependency, rows);
			}
		});
	}

	async removeForAgent(agentId: string, ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentCredentialDependency, { agentId });
	}

	async findByCredentialIds(
		credentialIds: string[],
		ctx: OperationContext,
	): Promise<AgentCredentialDependencyReference[]> {
		if (credentialIds.length === 0) return [];

		return await this.table.managerFor(ctx).find(AgentCredentialDependency, {
			select: ['agentId', 'credentialId'],
			where: { credentialId: In(credentialIds) },
		});
	}

	private async findExistingCredentialIds(
		manager: EntityManager,
		credentialIds: ReadonlySet<string>,
		lockForUpdate: boolean,
	): Promise<Set<string>> {
		if (credentialIds.size === 0) return new Set();

		const query = manager
			.createQueryBuilder(CredentialsEntity, 'credential')
			.select(['credential.id'])
			.where('credential.id IN (:...credentialIds)', { credentialIds: [...credentialIds] });
		query.orderBy('credential.id', 'ASC');
		if (lockForUpdate) query.setLock('pessimistic_write');

		return new Set((await query.getMany()).map(({ id }) => id));
	}
}
