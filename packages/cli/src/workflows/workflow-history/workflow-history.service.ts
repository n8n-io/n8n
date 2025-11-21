import { Logger } from '@n8n/backend-common';
import type { User, WorkflowHistoryUpdate } from '@n8n/db';
import { WorkflowHistory, WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { type EntityManager } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';
import { ensureError, UnexpectedError } from 'n8n-workflow';

import { WorkflowFinderService } from '../workflow-finder.service';

import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async getList(user: User, workflowId: string, take: number, skip: number) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const result = await this.workflowHistoryRepository
			.createQueryBuilder('wh')
			.leftJoin(
				(qb) => {
					return qb
						.select('wph.versionId', 'versionId')
						.addSelect('MAX(wph.createdAt)', 'maxCreatedAt')
						.from('workflow_publish_history', 'wph')
						.where('wph.workflowId = :workflowId', { workflowId: workflow.id })
						.andWhere('wph.mode IN (:...modes)', { modes: ['activated', 'updated'] })
						.groupBy('wph.versionId');
				},
				'latestPublished',
				'latestPublished.versionId = wh.versionId',
			)
			.leftJoinAndSelect(
				'wh.workflowPublishHistory',
				'wph',
				'wph.createdAt = latestPublished.maxCreatedAt',
			)
			.where('wh.workflowId = :workflowId', { workflowId: workflow.id })
			.select([
				'wh.workflowId',
				'wh.versionId',
				'wh.authors',
				'wh.createdAt',
				'wh.updatedAt',
				'wph.createdAt',
				'wph.userId',
			])
			.take(take)
			.skip(skip)
			.orderBy('wh.createdAt', 'DESC')
			.getMany();

		return result.map(({ workflowPublishHistory, ...rest }) => ({
			...rest,
			lastActivatedAt: workflowPublishHistory[0]?.createdAt,
			lastActivatedBy: workflowPublishHistory[0]?.userId,
		}));
	}

	async getVersion(user: User, workflowId: string, versionId: string): Promise<WorkflowHistory> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
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

	async saveVersion(
		user: User,
		workflow: IWorkflowBase,
		workflowId: string,
		transactionManager?: EntityManager,
	) {
		if (!workflow.nodes || !workflow.connections) {
			throw new UnexpectedError(
				`Cannot save workflow history: nodes and connections are required for workflow ${workflowId}`,
			);
		}

		const repository = transactionManager
			? transactionManager.getRepository(WorkflowHistory)
			: this.workflowHistoryRepository;

		try {
			await repository.insert({
				authors: user.firstName + ' ' + user.lastName,
				connections: workflow.connections,
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
			});
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to save workflow history version for workflow ${workflowId}`, {
				error,
			});
		}
	}

	async updateVersion(versionId: string, workflowId: string, updateData: WorkflowHistoryUpdate) {
		await this.workflowHistoryRepository.update({ versionId, workflowId }, { ...updateData });
	}
}
