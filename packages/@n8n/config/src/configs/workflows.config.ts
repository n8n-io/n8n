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
	indexingEnabled: boolean = true;

	/** Whether to use the workflow publication service. Still under development. */
	@Env('N8N_USE_WORKFLOW_PUBLICATION_SERVICE')
	useWorkflowPublicationService: boolean = false;
}
