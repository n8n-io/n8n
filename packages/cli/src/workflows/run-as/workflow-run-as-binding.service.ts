import { isEnvFeatureEnabled } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRunAsBindingRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export const RUN_AS_FEATURE_FLAG = 'N8N_ENV_FEAT_DYNAMIC_CREDENTIALS_RUN_AS';

/** A transaction handle. This type comes from the repository, not from `@n8n/typeorm`, to keep TypeORM out of business logic. */
type Trx = Parameters<WorkflowRunAsBindingRepository['insertActive']>[1];

/**
 * The only write path to `workflow_run_as_binding`. A binding is always claimed
 * for the publisher themself: this service takes a `User`, never a user id from
 * a request. One active row per workflow; a claim replaces the previous one.
 */
@Service()
export class WorkflowRunAsBindingService {
	constructor(private readonly repository: WorkflowRunAsBindingRepository) {}

	isEnabled(): boolean {
		return isEnvFeatureEnabled(RUN_AS_FEATURE_FLAG);
	}

	async getActive(workflowId: string): Promise<{ userId: string } | null> {
		const binding = await this.repository.findActiveByWorkflowId(workflowId);
		return binding ? { userId: binding.userId } : null;
	}

	async claim(workflowId: string, publisher: User, trx?: Trx): Promise<void> {
		await this.repository.revokeActive(workflowId, trx);
		await this.repository.insertActive(
			{ workflowId, userId: publisher.id, setBy: publisher.id },
			trx,
		);
	}

	async revoke(workflowId: string, trx?: Trx): Promise<void> {
		await this.repository.revokeActive(workflowId, trx);
	}
}
