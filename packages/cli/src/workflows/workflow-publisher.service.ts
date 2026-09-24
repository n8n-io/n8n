import { Logger } from '@n8n/backend-common';
import { WorkflowPublishHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { isCredSharingEnabled } from '@/constants/credential-sharing';

/**
 * Resolves who a triggered execution should be attributed to.
 *
 * A schedule, poll or production webhook is started by the system, so nothing
 * on the execution path carries a user. n8n already records who published every
 * version, though — it just never reads it back. That record gives a triggered
 * run the identity it lacks: the workflow is attributed to whoever published
 * it, and stays attributed to them while they are away.
 */
@Service()
export class WorkflowPublisherService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly publishHistoryRepository: WorkflowPublishHistoryRepository,
	) {}

	/**
	 * The publisher of the workflow's active version, or `undefined` when there
	 * is none to attribute the run to.
	 *
	 * Left empty rather than substituted with a stand-in. A run with no identity
	 * behaves exactly as it does today, so callers need no fallback: this only
	 * ever adds attribution where there was none.
	 *
	 * Returns `undefined` while the feature flag is off, which is the single
	 * gate for this behaviour — call sites stay unconditional.
	 *
	 * @param activeVersionId - pass it when the caller already holds the
	 * workflow, which the schedule, poll and webhook paths all do. This runs per
	 * execution on those paths, so the lookup it saves is per execution too.
	 */
	async findPublisherUserId(
		workflowId: string,
		activeVersionId?: string | null,
	): Promise<string | undefined> {
		if (!isCredSharingEnabled()) return undefined;

		const versionId =
			activeVersionId !== undefined
				? activeVersionId
				: (
						await this.workflowRepository.findOne({
							where: { id: workflowId },
							select: ['id', 'activeVersionId'],
						})
					)?.activeVersionId;

		const publisherUserId = await this.publishHistoryRepository.findPublisherUserId(
			workflowId,
			versionId,
		);

		if (!publisherUserId) {
			// A deleted publisher, or a workflow that arrived without an activation
			// record — imported from source control, say.
			this.logger.debug('Triggered execution has no publishing user to attribute it to', {
				workflowId,
			});
		}

		return publisherUserId;
	}
}
