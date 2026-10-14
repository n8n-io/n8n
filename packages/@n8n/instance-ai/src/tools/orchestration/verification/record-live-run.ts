/**
 * Live runs as verification evidence.
 *
 * `verify-built-workflow` always simulates nodes with side effects, so the live
 * test it recommends runs through `executions(action="run")`. Without this, the
 * stored claim keeps the simulated verdict and the publish gate warns about a
 * path the user just saw succeed.
 */

import { analyzeVerificationResult, countProducedOutputRows } from './analyze-result';
import { deriveVerificationClaim } from './claim';
import type { ExecutionRunResult } from './types';
import type { InstanceAiContext } from '../../../types';
import type { VerificationClaim } from '../../../workflow-loop/workflow-loop-state';

/**
 * Record a live run on the workflow's latest build outcome when it proves the
 * whole workflow. Returns the stored claim, or undefined when nothing changed.
 *
 * Only a `verified` run is recorded: a live run can raise the verdict but never
 * lower it. A narrow or failed ad hoc run (one branch, injected trigger input,
 * saved pins) says less than the verification it would replace.
 */
export async function recordLiveRunVerification(args: {
	context: InstanceAiContext;
	workflowId: string;
	triggerNodeName?: string;
	result: ExecutionRunResult;
}): Promise<VerificationClaim | undefined> {
	const { context, workflowId, triggerNodeName, result } = args;
	const buildContext = context.workflowBuildContext;
	const workflowTaskService = buildContext?.workflowTaskService;
	if (!buildContext || !workflowTaskService || result.status !== 'success') return undefined;

	try {
		const outcome = await workflowTaskService.getLatestBuildOutcomeForWorkflow(workflowId);
		const plan = outcome?.nodeSimulationPlan;
		// A verification in flight owns the record; do not race its write.
		if (!outcome || !plan || outcome.verification?.status === 'running') return undefined;

		// A save during the run moves the draft past the version that ran, and
		// this run proves nothing about the newer draft.
		const executedVersionId = result.workflowVersionId;
		const head = await context.workflowService.getWorkflowHead(workflowId);
		if (!executedVersionId || head.versionId !== executedVersionId) return undefined;

		// No planned simulations: this run used no verification pin data. Saved
		// pins and injected trigger input still count as simulated in the analysis.
		const analysis = analyzeVerificationResult({
			result,
			buildOutcome: outcome,
			simulatedNodes: [],
			stateBefore: undefined,
			runId: context.runId ?? buildContext.runId,
			triggerNodeName,
		});
		const claim = deriveVerificationClaim({
			analysis,
			plannedNodeCount: plan.length,
			publishState: { activeVersionId: head.activeVersionId, draftVersionId: executedVersionId },
		});
		if (claim.level !== 'verified') return undefined;

		return await workflowTaskService.recordVerification(outcome.workItemId, {
			attempted: true,
			success: true,
			executionId: result.executionId || undefined,
			status: result.status,
			claim,
			evidence: {
				nodesExecuted: analysis.nodesExecuted,
				producedOutputRows: countProducedOutputRows(result.data),
			},
			verifiedAt: new Date().toISOString(),
		});
	} catch (error) {
		// Advisory: the run itself succeeded, and the stored verdict stays as it was.
		context.logger.warn('Failed to record a live run as verification evidence', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}
