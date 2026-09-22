import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { WorkflowPublicationRetryState } from '../entities';

@Service()
export class WorkflowPublicationRetryStateRepository extends Repository<WorkflowPublicationRetryState> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublicationRetryState, dataSource.manager);
	}

	async suppressRetry(
		workflowId: string,
		targetVersionId: string,
		trx?: EntityManager,
	): Promise<void> {
		await (trx ?? this.manager).upsert(
			WorkflowPublicationRetryState,
			{ workflowId, targetVersionId },
			['workflowId'],
		);
	}

	async clearRetrySuppression(workflowId: string, trx?: EntityManager): Promise<void> {
		await (trx ?? this.manager).delete(WorkflowPublicationRetryState, { workflowId });
	}
}
