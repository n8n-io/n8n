import type { WorkflowTaskService } from './types';
import type { OrchestrationContext } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { CREDENTIALLESS_AI_ROOT_SIMULATION_REASON } from '../../workflows/plan-verification-simulation';
import { reconcileSimulationPlan } from '../../workflows/reconcile-simulation-plan';
import { buildCredentialMap } from '../../workflows/resolve-credentials';

/**
 * Refresh the build outcome's mocked-credential plan against the live
 * workflow before a verification run. Credentials assigned after the build
 * (setup flow, apply-workflow-credentials, manual selection in the editor)
 * never trigger a rebuild, so without this step every verify replays the
 * build-time mock. Best-effort: on any failure the stored plan is used as-is.
 */
export async function reconcileStaleCredentialPlan(args: {
	buildOutcome: WorkflowBuildOutcome;
	workflowId: string;
	domainContext: NonNullable<OrchestrationContext['domainContext']>;
	workflowTaskService: WorkflowTaskService;
	logger: OrchestrationContext['logger'];
	/** Host-resolved model used when no eval model API key is configured in the environment. */
	fallbackModelConfig?: OrchestrationContext['modelId'];
}): Promise<WorkflowBuildOutcome> {
	const {
		buildOutcome,
		workflowId,
		domainContext,
		workflowTaskService,
		logger,
		fallbackModelConfig,
	} = args;
	// Reconciliation can change something only when the outcome holds mocked
	// credentials or an AI root simulated for missing model credentials.
	const hasMockedCredentials = Object.keys(buildOutcome.mockedCredentialsByNode ?? {}).length > 0;
	const hasCredentiallessAiRoots = (buildOutcome.nodeSimulationPlan ?? []).some(
		(verdict) =>
			verdict.verdict === 'simulate' && verdict.reason === CREDENTIALLESS_AI_ROOT_SIMULATION_REASON,
	);
	if (!hasMockedCredentials && !hasCredentiallessAiRoots) return buildOutcome;

	try {
		const workflow = await domainContext.workflowService.getAsWorkflowJSON(workflowId);
		const availableCredentials = await buildCredentialMap(domainContext.credentialService);
		const patch = await reconcileSimulationPlan({
			buildOutcome,
			workflow,
			availableCredentials,
			fallbackModelConfig,
		});
		if (!patch) return buildOutcome;

		await workflowTaskService.updateBuildOutcome(buildOutcome.workItemId, patch);
		logger.info(
			'verify-built-workflow: refreshed stale mocked-credential plan from the live workflow',
			{
				workItemId: buildOutcome.workItemId,
				workflowId,
				remainingMockedNodes: patch.mockedNodeNames ?? [],
			},
		);
		return { ...buildOutcome, ...patch };
	} catch (error) {
		logger.warn('verify-built-workflow: could not reconcile mocked-credential plan', {
			workItemId: buildOutcome.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return buildOutcome;
	}
}
