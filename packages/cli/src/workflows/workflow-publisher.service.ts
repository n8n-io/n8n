import { Logger } from '@n8n/backend-common';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
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
		private readonly publishHistoryRepository: WorkflowPublishHistoryRepository,
	) {}

	/**
	 * The publisher of the given version, or `undefined` when there is none to
	 * attribute the run to.
	 *
	 * Left empty rather than substituted with a stand-in. A run with no identity
	 * behaves exactly as it does today, so callers need no fallback: this only
	 * ever adds attribution where there was none.
	 *
	 * Returns `undefined` while the feature flag is off, which is the single
	 * gate for this behaviour — call sites stay unconditional.
	 *
	 * @param executedVersionId - the version whose nodes the run executes, which
	 * every caller already holds. Deliberately not the workflow row's
	 * `activeVersionId`: publication writes that row before it swaps the
	 * published-version mapping, so mid-publication the row names a version the
	 * run is not executing. Absent means unattributed, never "use the newest
	 * activation" — an unpublished or stale workflow must not inherit the
	 * identity of whoever published something else.
	 */
	async findPublisherUserId(
		workflowId: string,
		executedVersionId: string | null | undefined,
	): Promise<string | undefined> {
		if (!isCredSharingEnabled()) return undefined;

		if (!executedVersionId) {
			// Nothing to attribute to. The latest activation belongs to whichever
			// version was published last, which is not the one running here, so
			// guessing would hand the run an identity it never had.
			this.logger.debug('Triggered execution has no version to attribute it to', { workflowId });
			return undefined;
		}

		const publisherUserId = await this.publishHistoryRepository.findPublisherUserId(
			workflowId,
			executedVersionId,
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
