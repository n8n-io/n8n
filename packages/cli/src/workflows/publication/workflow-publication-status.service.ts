import type { WorkflowPublicationStatus } from '@n8n/api-types';
import {
	type WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	type WorkflowPublicationTriggerStatus,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

@Service()
export class WorkflowPublicationStatusService {
	constructor(
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly triggerStatusRepository: WorkflowPublicationTriggerStatusRepository,
	) {}

	/**
	 * Get the publication status of a workflow.
	 *
	 * The status is derived from the latest outbox record and the current trigger statuses.
	 *
	 * NOTE: we only update the trigger statuses when a publication is completed,
	 * so if there is a publication in progress, the trigger statuses may not reflect the latest state.
	 */
	async getStatus(workflowId: string): Promise<WorkflowPublicationStatus> {
		const [latestPublicationRequest, currentTriggerStatuses] = await Promise.all([
			this.outboxRepository.findLatestByWorkflowId(workflowId),
			this.triggerStatusRepository.findByWorkflowId(workflowId),
		]);

		const triggers = currentTriggerStatuses.map((r) => ({
			nodeId: r.nodeId,
			status: r.status,
			errorMessage: r.errorMessage,
		}));

		const isPublishing =
			latestPublicationRequest?.status === 'pending' ||
			latestPublicationRequest?.status === 'in_progress';
		const pendingVersionId = isPublishing ? latestPublicationRequest.publishedVersionId : null;

		// The settled rows ARE the running triggers; if none are activated, nothing is live.
		const activatedRow = currentTriggerStatuses.find((r) => r.status === 'activated');
		const liveVersionId = activatedRow?.versionId ?? null;

		const status = this.deriveStatus(
			isPublishing,
			currentTriggerStatuses,
			latestPublicationRequest,
		);
		return { status, liveVersionId, pendingVersionId, triggers };
	}

	private deriveStatus(
		isPublishing: boolean,
		currentTriggerStatuses: WorkflowPublicationTriggerStatus[],
		latestPublicationRequest: WorkflowPublicationOutbox | null,
	): WorkflowPublicationStatus['status'] {
		if (isPublishing) return 'in_progress';
		if (currentTriggerStatuses.length > 0) {
			const failed = currentTriggerStatuses.filter((r) => r.status === 'failed').length;
			return failed === 0
				? 'published'
				: failed < currentTriggerStatuses.length
					? 'partial'
					: 'failed';
		}
		return latestPublicationRequest?.status === 'failed' ? 'failed' : 'not_published';
	}
}
