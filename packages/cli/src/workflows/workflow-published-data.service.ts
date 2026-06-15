import {
	WorkflowPublishedVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
	) {}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and the
	 * `WorkflowHistory` row that the `workflow_published_version` mapping currently
	 * points at, or `null` when there is no published version.
	 *
	 * A missing mapping is not inherently an error — an unpublished workflow simply
	 * has none — so callers decide how to treat `null` (trigger reads, where the
	 * mapping is expected to exist, throw; execution reads treat it as "not active").
	 */
	async getPublishedWorkflowData(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory } | null> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return { workflow: record.workflow, publishedVersion: record.publishedVersion };
	}
}
