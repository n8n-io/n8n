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

	async getList(
		user: User,
		workflowId: string,
		take: number,
		skip: number,
	): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>> {
		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		return await this.workflowHistoryRepository.find({
			where: {
				workflowId: workflow.id,
			},
			take,
			skip,
			select: ['workflowId', 'versionId', 'authors', 'createdAt', 'updatedAt'],
			order: { createdAt: 'DESC' },
		});
	}

	async getVersion(user: User, workflowId: string, versionId: string): Promise<WorkflowHistory> {
		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const hist = await this.workflowHistoryRepository.findOne({
			where: {
				workflowId: workflow.id,
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
		// changing workflow settings or renaming. In these cases, we need to fetch the
		// full workflow from the database to save the correct version.
		let workflowToSave: WorkflowEntity | null = workflow;
		if (!workflow.nodes || !workflow.connections) {
			workflowToSave = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
				'workflow:read',
			]);
		}
		if (isWorkflowHistoryEnabled() && workflowToSave) {
			try {
				await this.workflowHistoryRepository.insert({
					authors: user.firstName + ' ' + user.lastName,
					connections: workflowToSave.connections,
					nodes: workflowToSave.nodes,
					versionId: workflowToSave.versionId,
					workflowId,
				});
			} catch (e) {
				console.log('ERROR');
				this.logger.error(
					`Failed to save workflow history version for workflow ${workflowId}`,
					e as Error,
				);
			}
		}
	}
}
