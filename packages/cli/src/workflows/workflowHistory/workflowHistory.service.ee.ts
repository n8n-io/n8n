import type { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import type { User } from '@/databases/entities/User';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { WorkflowHistory } from '@/databases/entities/WorkflowHistory';
import { SharedWorkflowRepository } from '@/databases/repositories';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { Service } from 'typedi';
import { isWorkflowHistoryEnabled } from './workflowHistoryHelper.ee';
import { getLogger } from '@/Logger';

export class SharedWorkflowNotFoundError extends Error {}
export class HistoryVersionNotFoundError extends Error {}

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	private async getSharedWorkflow(user: User, workflowId: string): Promise<SharedWorkflow | null> {
		return this.sharedWorkflowRepository.findOne({
			where: {
				...(!user.isOwner && { userId: user.id }),
				workflowId,
			},
		});
	}

	async getList(
		user: User,
		workflowId: string,
		take: number,
		skip: number,
	): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>> {
		const sharedWorkflow = await this.getSharedWorkflow(user, workflowId);
		if (!sharedWorkflow) {
			throw new SharedWorkflowNotFoundError();
		}
		return this.workflowHistoryRepository.find({
			where: {
				workflowId: sharedWorkflow.workflowId,
			},
			take,
			skip,
			select: ['workflowId', 'versionId', 'authors', 'createdAt', 'updatedAt'],
			order: { createdAt: 'DESC' },
		});
	}

	async getVersion(user: User, workflowId: string, versionId: string): Promise<WorkflowHistory> {
		const sharedWorkflow = await this.getSharedWorkflow(user, workflowId);
		if (!sharedWorkflow) {
			throw new SharedWorkflowNotFoundError();
		}
		const hist = await this.workflowHistoryRepository.findOne({
			where: {
				workflowId: sharedWorkflow.workflowId,
				versionId,
			},
		});
		if (!hist) {
			throw new HistoryVersionNotFoundError();
		}
		return hist;
	}

	async saveVersion(user: User, workflow: WorkflowEntity, workflowId: string) {
		if (isWorkflowHistoryEnabled()) {
			try {
				await this.workflowHistoryRepository.insert({
					authors: user.firstName + ' ' + user.lastName,
					connections: workflow.connections,
					nodes: workflow.nodes,
					versionId: workflow.versionId,
					workflowId,
				});
			} catch (e) {
				getLogger().error(
					`Failed to save workflow history version for workflow ${workflowId}`,
					e as Error,
				);
			}
		}
	}
}
