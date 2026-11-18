import type { WorkflowReviewCheck } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/** The review and the versions that it pins. */
export type WorkflowReviewCheckSubject = {
	workflowReviewRequestId: string;
	workflows: Array<{ workflowId: string; workflowVersionId: string | null }>;
};

export interface WorkflowReviewCheckProvider {
	/** Returns no check when it does not apply, for example to a workflow without tests. */
	getChecks(viewer: User, subject: WorkflowReviewCheckSubject): Promise<WorkflowReviewCheck[]>;
}

/**
 * Lets other modules add automatic checks to a review without a dependency from
 * the review module on them. The detail shows the checks, and approval needs
 * each of them to pass.
 */
@Service()
export class WorkflowReviewCheckRegistry {
	private readonly providers: WorkflowReviewCheckProvider[] = [];

	register(provider: WorkflowReviewCheckProvider) {
		this.providers.push(provider);
	}

	/** A provider that fails rejects the call, so approval cannot skip its check. */
	async getChecks(viewer: User, subject: WorkflowReviewCheckSubject) {
		const checks = await Promise.all(
			this.providers.map(async (provider) => await provider.getChecks(viewer, subject)),
		);
		return checks.flat();
	}
}
