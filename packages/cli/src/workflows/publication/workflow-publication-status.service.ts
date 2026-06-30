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

	async getStatus(workflowId: string): Promise<WorkflowPublicationStatus> {
		const [latest, rows] = await Promise.all([
			this.outboxRepository.findLatestByWorkflowId(workflowId),
			this.triggerStatusRepository.findByWorkflowId(workflowId),
		]);

		const triggers = rows.map((r) => ({
			nodeId: r.nodeId,
			status: r.status,
			errorMessage: r.errorMessage,
		}));

		const isPublishing = latest?.status === 'pending' || latest?.status === 'in_progress';
		const pendingVersionId = isPublishing ? latest.publishedVersionId : null;

		// The settled rows ARE the running triggers; if none are activated, nothing is live.
		const activatedRow = rows.find((r) => r.status === 'activated');
		const liveVersionId = activatedRow?.versionId ?? null;

		const status = this.deriveStatus(isPublishing, rows, latest);
		return { status, liveVersionId, pendingVersionId, triggers };
	}

	private deriveStatus(
		isPublishing: boolean,
		rows: WorkflowPublicationTriggerStatus[],
		latest: WorkflowPublicationOutbox | null,
	): WorkflowPublicationStatus['status'] {
		if (isPublishing) return 'in_progress';
		if (rows.length > 0) {
			const failed = rows.filter((r) => r.status === 'failed').length;
			return failed === 0 ? 'published' : failed < rows.length ? 'partial' : 'failed';
		}
		return latest?.status === 'failed' ? 'failed' : 'not_published';
	}
}
