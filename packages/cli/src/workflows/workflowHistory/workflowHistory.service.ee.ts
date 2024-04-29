import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { WorkflowHistory } from '@db/entities/WorkflowHistory';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { Service } from 'typedi';
import { isWorkflowHistoryEnabled } from './workflowHistoryHelper.ee';
import { Logger } from '@/Logger';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	private async getSharedWorkflow(user: User, workflowId: string): Promise<SharedWorkflow | null> {
		return await this.sharedWorkflowRepository.findOne({
			where: {
				...(!user.hasGlobalScope('workflow:read') && { userId: user.id }),
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
			throw new SharedWorkflowNotFoundError('');
		}
		return await this.workflowHistoryRepository.find({
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
			throw new SharedWorkflowNotFoundError('');
		}
		const hist = await this.workflowHistoryRepository.findOne({
			where: {
				workflowId: sharedWorkflow.workflowId,
				versionId,
			},
		});
		if (!hist) {
			throw new WorkflowHistoryVersionNotFoundError('');
		}
		return hist;
	}

	async saveVersion(user: User, workflow: WorkflowEntity, workflowId: string) {
		// On some update scenarios, `nodes` and `connections` are missing, such as when
		// changing workflow settings or renaming. In these cases, we don't want to save
		// a new version
		if (isWorkflowHistoryEnabled() && workflow.nodes && workflow.connections) {
			try {
				await this.workflowHistoryRepository.insert({
					authors: user.firstName + ' ' + user.lastName,
					connections: workflow.connections,
					nodes: workflow.nodes,
					versionId: workflow.versionId,
					workflowId,
				});
			} catch (e) {
				this.logger.error(
					`Failed to save workflow history version for workflow ${workflowId}`,
					e as Error,
				);
			}
		}
	}
}
