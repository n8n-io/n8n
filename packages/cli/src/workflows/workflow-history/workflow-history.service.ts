import { Logger } from '@n8n/backend-common';
import type { User, WorkflowHistory } from '@n8n/db';
import { WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';
import { ensureError, UnexpectedError } from 'n8n-workflow';

import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';

import { WorkflowFinderService } from '../workflow-finder.service';

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async getList(
		user: User,
		workflowId: string,
		take: number,
		skip: number,
	): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
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

	async saveVersion(user: User, workflow: IWorkflowBase, workflowId: string) {
		if (!workflow.nodes || !workflow.connections) {
			throw new UnexpectedError(
				`Cannot save workflow history: nodes and connections are required for workflow ${workflowId}`,
			);
		}

		try {
			await this.workflowHistoryRepository.insert({
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
}
