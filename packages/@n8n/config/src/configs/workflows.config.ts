import { z } from 'zod';

import { Config, Env } from '../decorators';

const callerPolicySchema = z.enum(['any', 'none', 'workflowsFromAList', 'workflowsFromSameOwner']);
type CallerPolicy = z.infer<typeof callerPolicySchema>;

@Config
export class WorkflowsConfig {
	/** Default name for workflow */
	@Env('WORKFLOWS_DEFAULT_NAME')
	defaultName: string = 'My workflow';

	/** Default option for which workflows may call the current workflow */
	@Env('N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION', callerPolicySchema)
	callerPolicyDefaultOption: CallerPolicy = 'workflowsFromSameOwner';

	/** How many workflows to activate simultaneously during startup. */
	@Env('N8N_WORKFLOW_ACTIVATION_BATCH_SIZE')
	activationBatchSize: number = 1;

	// Loop Detection Configuration (PAY-2940)
	/** Maximum number of executions per time window per node for loop detection */
	@Env('N8N_WORKFLOW_MAX_EXECUTION_RATE')
	maxExecutionRate: number = 10;

	/** Time window in milliseconds for loop detection */
	@Env('N8N_WORKFLOW_LOOP_TIME_WINDOW')
	loopTimeWindow: number = 5000;

	/** Maximum path length for execution path tracking */
	@Env('N8N_WORKFLOW_MAX_PATH_LENGTH')
	maxPathLength: number = 100;

	/** Maximum total history size to prevent unbounded memory growth */
	@Env('N8N_WORKFLOW_MAX_HISTORY_SIZE')
	maxHistorySize: number = 1000;

	/** Clock skew tolerance in milliseconds for handling system clock changes */
	@Env('N8N_WORKFLOW_CLOCK_SKEW_TOLERANCE')
	clockSkewTolerance: number = 1000;

	/** Maximum path depth for sophisticated cycle detection */
	@Env('N8N_WORKFLOW_MAX_PATH_DEPTH')
	maxPathDepth: number = 50;

	// SplitInBatches Configuration (PAY-2940)
	/** Maximum executions allowed for SplitInBatches node to prevent infinite loops */
	@Env('N8N_SPLITINBATCHES_MAX_EXECUTIONS')
	splitInBatchesMaxExecutions: number = 100000;
}
