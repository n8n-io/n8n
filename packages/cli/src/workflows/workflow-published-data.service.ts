import {
	WorkflowPublishedVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and
	 * the `WorkflowHistory` row that the `workflow_published_version` mapping
	 * currently points at.
	 */
	async getPublishedWorkflowData(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory } | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		// Reached when no published_version mapping exists for the workflow. For
		// trigger reads this should never happen (the publication service stops
		// triggers before deleting the record), so it indicates a real bug.
		// Execution-path readers (sub-workflow, error workflow, MCP execute) may
		// also hit this for a workflow that simply isn't published; they treat a
		// null return as "not active".
		if (!record?.publishedVersion || !record.workflow) {
			this.errorReporter.error(
				new UnexpectedError('Published version record not found for workflow', {
					extra: { workflowId },
				}),
			);
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}
}
