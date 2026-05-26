import { WorkflowPublishedVersionRepository, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

/**
 * The published nodes/connections for a workflow, together with the workflow
 * entity they belong to. Returned by {@link WorkflowPublishedDataService}.
 */
export interface PublishedWorkflowData {
	nodes: INode[];
	connections: IConnections;
	workflow: WorkflowEntity;
}

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		// This should not happen: only triggers read from this service, and they
		// only do so when the flag is on; the publication service stops triggers
		// before deleting the record. If we hit this, we have a real bug.
		if (!record?.publishedVersion || !record.workflow) {
			this.errorReporter.error(
				new UnexpectedError('Published version record not found for workflow', {
					extra: { workflowId },
				}),
			);
			return null;
		}

		const { publishedVersion, workflow } = record;

		return {
			nodes: publishedVersion.nodes,
			connections: publishedVersion.connections,
			workflow,
		};
	}
}
