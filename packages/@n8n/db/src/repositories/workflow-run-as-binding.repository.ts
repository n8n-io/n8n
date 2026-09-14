import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { WorkflowRunAsBinding } from '../entities';

@Service()
export class WorkflowRunAsBindingRepository extends Repository<WorkflowRunAsBinding> {
	constructor(dataSource: DataSource) {
		super(WorkflowRunAsBinding, dataSource.manager);
	}

	async findActiveByWorkflowId(workflowId: string): Promise<WorkflowRunAsBinding | null> {
		return await this.findOne({ where: { workflowId, status: 'active' } });
	}

	async insertActive(
		{ workflowId, userId, setBy }: Pick<WorkflowRunAsBinding, 'workflowId' | 'userId' | 'setBy'>,
		trx?: EntityManager,
	): Promise<void> {
		const repository = trx ? trx.getRepository(WorkflowRunAsBinding) : this;
		await repository.insert({ id: randomUUID(), workflowId, userId, setBy, status: 'active' });
	}

	async revokeActive(workflowId: string, trx?: EntityManager): Promise<number> {
		const repository = trx ? trx.getRepository(WorkflowRunAsBinding) : this;
		const result = await repository.update({ workflowId, status: 'active' }, { status: 'revoked' });
		return result.affected ?? 0;
	}
}
