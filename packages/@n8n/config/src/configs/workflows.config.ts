import { z } from 'zod';

import { Config, Env } from '../decorators';

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

	/** Whether to build and maintain workflow dependency indexes (for example, for subworkflow callers). */
	@Env('N8N_WORKFLOWS_INDEXING_ENABLED')
	indexingEnabled: boolean = false;

	/** Whether to use the workflow publication service. Still under development. */
	@Env('N8N_USE_WORKFLOW_PUBLICATION_SERVICE')
	useWorkflowPublicationService: boolean = false;

	/** Whether workflow sharing is disabled */
	@Env('N8N_DISABLE_WORKFLOW_SHARING')
	disableSharing: boolean = false;

	/** Minimum allowed schedule interval in seconds for schedule triggers */
	@Env('N8N_MIN_SCHEDULE_INTERVAL_SECONDS')
	minScheduleIntervalSeconds: number = 300;

	/** DO NOT USE - Enable draft/publish workflow feature */
	@Env('N8N_ENV_FEAT_WORKFLOWS_DRAFT_PUBLISH_ENABLED')
	draftPublishEnabled: boolean = false;
}
