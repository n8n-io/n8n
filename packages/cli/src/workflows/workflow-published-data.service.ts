import {
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Result of resolving a workflow's published version: either the data, or a
 * reason it could not be resolved (the workflow has no published version, or
 * it does not exist at all).
 */
export type PublishedWorkflowData =
	| { workflow: WorkflowEntity; publishedVersion: WorkflowHistory }
	| 'no-published-version'
	| 'workflow-not-found';

@Service()
export class WorkflowPublishedDataService {
	constructor(
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Resolves a workflow's published version: returns the workflow entity and the
	 * `WorkflowHistory` row that the `workflow_published_version` mapping currently
	 * points at, or — when there is no mapping — distinguishes a workflow that
	 * exists but was never published from one that does not exist.
	 */
	async getPublishedWorkflowData(workflowId: string): Promise<PublishedWorkflowData> {
		const record =
			await this.workflowPublishedVersionRepository.getPublishedVersionWithRelations(workflowId);

		if (record?.publishedVersion && record.workflow) {
			return { workflow: record.workflow, publishedVersion: record.publishedVersion };
		}

		// The mapping row only exists once a workflow is published, so a missing
		// mapping needs an existence check to tell the two cases apart.
		const exists = await this.workflowRepository.existsBy({ id: workflowId });
		return exists ? 'no-published-version' : 'workflow-not-found';
	}
}
