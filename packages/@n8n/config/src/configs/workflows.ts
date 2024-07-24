import { Config, Env } from '../decorators';

@Config
export class WorkflowsConfig {
	/** Default name for workflow */
	@Env('WORKFLOWS_DEFAULT_NAME')
	readonly defaultName: string = 'My workflow';

	/** Show onboarding flow in new workflow */
	@Env('N8N_ONBOARDING_FLOW_DISABLED')
	readonly onboardingFlowDisabled: boolean = false;

	/** Default option for which workflows may call the current workflow */
	@Env('N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION')
	readonly callerPolicyDefaultOption:
		| 'any'
		| 'none'
		| 'workflowsFromAList'
		| 'workflowsFromSameOwner' = 'workflowsFromSameOwner';
}
