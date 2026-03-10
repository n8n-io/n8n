import { Logger } from '@n8n/backend-common';
import { WorkflowPublishedVersionRepository, WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, IConnections } from 'n8n-workflow';

export interface PublishedWorkflowVersion {
	versionId: string;
	nodes: INode[];
	connections: IConnections;
}

@Service()
export class WorkflowPublishedVersionService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
	) {}

	async getPublishedVersion(workflowId: string): Promise<PublishedWorkflowVersion | null> {
		const publishedVersionId =
			await this.workflowPublishedVersionRepository.getPublishedVersionId(workflowId);

		if (!publishedVersionId) {
			return null;
		}

		const history = await this.workflowHistoryRepository.findOne({
			where: { versionId: publishedVersionId, workflowId },
			select: ['versionId', 'nodes', 'connections'],
		});

		if (!history) {
			this.logger.warn('Published version record points to missing workflow history entry', {
				workflowId,
				publishedVersionId,
			});
			return null;
		}

		return {
			versionId: history.versionId,
			nodes: history.nodes,
			connections: history.connections,
		};
	}
}
