import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';

import { AiBuilderTemporaryWorkflow } from '../entities';

@Service()
export class AiBuilderTemporaryWorkflowRepository extends Repository<AiBuilderTemporaryWorkflow> {
	constructor(dataSource: DataSource) {
		super(AiBuilderTemporaryWorkflow, dataSource.manager);
	}

	async mark(
		workflowId: string,
		threadId: string,
		entityManager: EntityManager = this.manager,
	): Promise<void> {
		await entityManager.upsert(AiBuilderTemporaryWorkflow, { workflowId, threadId }, [
			'workflowId',
		]);
	}

	async unmark(workflowId: string, entityManager: EntityManager = this.manager): Promise<void> {
		await entityManager.delete(AiBuilderTemporaryWorkflow, { workflowId });
	}

	async findByThread(threadId: string): Promise<AiBuilderTemporaryWorkflow[]> {
		return await this.find({
			where: { threadId },
			select: ['workflowId', 'threadId'],
		});
	}

	async existsForWorkflow(workflowId: string): Promise<boolean> {
		return await this.existsBy({ workflowId });
	}

	/** The chat that marked the workflow, or null when the workflow has no marker. */
	async findThreadIdForWorkflow(workflowId: string): Promise<string | null> {
		const marker = await this.findOne({ where: { workflowId }, select: ['threadId'] });
		return marker?.threadId ?? null;
	}
}
