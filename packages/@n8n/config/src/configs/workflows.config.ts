import { Time } from '@n8n/constants';
import { z } from 'zod';

import { Config, Env } from '../decorators';
import { positiveIntSchema } from '../schemas';

const callerPolicySchema = z.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner']);
type CallerPolicy = z.infer<typeof callerPolicySchema>;

@Config
export class WorkflowsConfig {
	/** Default name suggested when creating a new workflow. */
	@Env('WORKFLOWS_DEFAULT_NAME')
	defaultName: string = 'My workflow';

	/** Default policy for which workflows are allowed to call this workflow (for example, same owner, any, none). */
	@Env('N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION', callerPolicySchema)
	callerPolicyDefaultOption: CallerPolicy = 'workflowsFromSameOwner';

	/** Number of workflows to activate in parallel during startup. */
	@Env('N8N_WORKFLOW_ACTIVATION_BATCH_SIZE')
	activationBatchSize: number = 1;

	/** Number of workflows to process per batch during dependency indexing on startup. Defaults to 10. */
	@Env('N8N_WORKFLOW_INDEX_BATCH_SIZE')
	indexingBatchSize: number = 10;

	/** Whether to use the workflow publication service. Still under development. */
	@Env('N8N_USE_WORKFLOW_PUBLICATION_SERVICE')
	useWorkflowPublicationService: boolean = false;

	/** Interval in milliseconds between polls of the workflow publication outbox on the leader. */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_POLL_INTERVAL_MS')
	publicationOutboxPollIntervalMs: number = 15 * Time.seconds.toMilliseconds;

	/** Seconds after which an `in_progress` workflow publication outbox record
	 *  is considered stale (its leader likely died) and may be reclaimed by a poll cycle. */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_LEASE_SECONDS')
	publicationOutboxLeaseSeconds: number = 2 * Time.minutes.toSeconds;

	/** Hours to keep `completed` workflow publication outbox records before the cleanup deletes them. */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_COMPLETED_RETENTION_HOURS')
	publicationOutboxCompletedRetentionHours: number = 1;

	/** Hours to keep `failed`/`partial_success` workflow publication outbox records (kept longer for diagnostics). */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_FAILED_RETENTION_HOURS')
	publicationOutboxFailedRetentionHours: number = 7 * 24;

	/** Interval in seconds between cleanup runs that delete terminal workflow publication outbox records on the leader. */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_INTERVAL_SECONDS', positiveIntSchema)
	publicationOutboxCleanupIntervalSeconds: number = 20 * Time.minutes.toSeconds;

	/** Maximum number of terminal workflow publication outbox records deleted per batch during cleanup. */
	@Env('N8N_WORKFLOW_PUBLICATION_OUTBOX_CLEANUP_BATCH_SIZE', positiveIntSchema)
	publicationOutboxCleanupBatchSize: number = 1000;

	/** Whether to disable automatic workflow saving in the editor */
	@Env('N8N_WORKFLOWS_AUTOSAVE_DISABLED')
	autosaveDisabled: boolean = false;
}
