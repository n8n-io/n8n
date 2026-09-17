import { Logger } from '@n8n/backend-common';
import { WorkflowPublishHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Resolves who a triggered execution acts as.
 *
 * A schedule, poll or production webhook is started by the system, so nothing
 * on the execution path carries a user. n8n records who published every
 * version, though, which gives triggered runs the identity they lack: the
 * workflow runs as whoever published it, and keeps running as them while they
 * are away.
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
	 * Left empty rather than substituted: a run with no identity is handled at
	 * the point where the identity matters. The execution-time credential check
	 * fails closed on a restricted credential and lets every other run through,
	 * so an unattributable schedule keeps working exactly as it does today.
	 */
	async findPublisherUserId(workflowId: string): Promise<string | undefined> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'activeVersionId'],
		});

		const publisherUserId = await this.publishHistoryRepository.findPublisherUserId(
			workflowId,
			workflow?.activeVersionId,
		);

		if (!publisherUserId) {
			this.logger.debug('Triggered execution has no publishing user to act as', { workflowId });
		}

		return publisherUserId;
	}
}
