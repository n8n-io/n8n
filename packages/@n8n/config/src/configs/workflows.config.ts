import { Config, Env } from '../decorators';

@Config
export class WorkflowsConfig {
	/** Default name for workflow */
	@Env('WORKFLOWS_DEFAULT_NAME')
	defaultName: string = 'My workflow';

	/** Default option for which workflows may call the current workflow */
	@Env('N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION')
	callerPolicyDefaultOption: 'any' | 'none' | 'workflowsFromAList' | 'workflowsFromSameOwner' =
		'workflowsFromSameOwner';

	/** How many workflows to activate simultaneously during startup. */
	@Env('N8N_WORKFLOW_ACTIVATION_BATCH_SIZE')
	activationBatchSize: number = 1;
}
