import type { WorkflowPublicationStatus } from '@n8n/api-types';
import {
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
	 * The status is derived from the in-flight publication (if any) and the current
	 * trigger statuses. The outbox is consulted only to detect an in-flight
	 * publication; settled state comes entirely from the trigger statuses.
	 *
	 * NOTE: we only update the trigger statuses when a publication is completed,
	 * so if there is a publication in progress, the trigger statuses may not reflect the latest state.
	 */
	async getStatus(workflowId: string): Promise<WorkflowPublicationStatus> {
		const [inFlightPublication, currentTriggerStatuses] = await Promise.all([
			this.outboxRepository.findInFlightByWorkflowId(workflowId),
			this.triggerStatusRepository.findByWorkflowId(workflowId),
		]);

		const triggers = currentTriggerStatuses.map((r) => ({
			nodeId: r.nodeId,
			status: r.status,
			errorMessage: r.errorMessage,
		}));

		const isPublishing = inFlightPublication !== null;
		const pendingVersionId = inFlightPublication?.publishedVersionId ?? null;

		// The settled rows ARE the running triggers; if none are activated, nothing is live.
		const activatedRow = currentTriggerStatuses.find((r) => r.status === 'activated');
		const liveVersionId = activatedRow?.versionId ?? null;

		const status = this.deriveStatus(isPublishing, currentTriggerStatuses);
		return { status, liveVersionId, pendingVersionId, triggers };
	}

	private deriveStatus(
		isPublishing: boolean,
		currentTriggerStatuses: WorkflowPublicationTriggerStatus[],
	): WorkflowPublicationStatus['status'] {
		if (isPublishing) return 'in_progress';
		if (currentTriggerStatuses.length === 0) return 'not_published';
		const failed = currentTriggerStatuses.filter((r) => r.status === 'failed').length;
		if (failed === 0) return 'published';
		return failed < currentTriggerStatuses.length ? 'partial' : 'failed';
	}
}
