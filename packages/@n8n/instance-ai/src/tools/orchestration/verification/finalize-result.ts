import {
	countProducedOutputRows,
	namesOrDataKeys,
	type VerificationAnalysis,
} from './analyze-result';
import type {
	ExecutionRunResult,
	ResolvedVerifyInput,
	VerifyBuiltWorkflowOutput,
	WorkflowTaskService,
} from './types';
import type { OrchestrationContext } from '../../../types';
import { createRemediation } from '../../../workflow-loop/remediation';
import type { RemediationMetadata } from '../../../workflow-loop/workflow-loop-state';

/**
 * Handle the no-simulation-plan case: refuse to run because destructive nodes
 * are not protected, persist the terminal verdict best-effort, and return a
 * blocked result.
 */
export async function handleMissingSimulationPlan(args: {
	input: ResolvedVerifyInput;
	context: OrchestrationContext;
	workflowTaskService: WorkflowTaskService;
	workflowId: string;
}): Promise<VerifyBuiltWorkflowOutput> {
	const { input, context, workflowTaskService, workflowId } = args;
	const guidance =
		'Verification was not run because the build outcome has no simulation plan. ' +
		'Rebuild or resubmit the workflow so destructive nodes can be classified before verification.';
	const remediation = createRemediation({
		category: 'blocked',
		shouldEdit: false,
		reason: 'missing_simulation_plan',
		guidance,
	});
	context.logger.warn(
		'verify-built-workflow: build outcome has no simulation plan — refusing to run without simulation safeguards',
		{ workItemId: input.workItemId, workflowId },
	);
	try {
		await workflowTaskService.updateBuildOutcome(input.workItemId, {
			remediation,
			verification: {
				attempted: true,
				success: false,
				status: 'unknown',
				failureSignature: 'missing_simulation_plan',
				evidence: { errorMessage: guidance },
				verifiedAt: new Date().toISOString(),
			},
		});
	} catch {
		// intentional: verification record persistence is advisory
	}
	try {
		await workflowTaskService.reportVerificationVerdict({
			workItemId: input.workItemId,
			runId: context.runId,
			workflowId,
			verdict: 'failed_terminal',
			failureSignature: 'missing_simulation_plan',
			diagnosis: guidance,
			remediation,
			summary: guidance,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to persist terminal verdict', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return {
		success: false,
		resolvedWorkItemId: input.workItemId,
		status: 'unknown',
		error: guidance,
		remediation,
		guidance,
	};
}

export async function persistVerificationOutcome(args: {
	input: ResolvedVerifyInput;
	context: OrchestrationContext;
	workflowTaskService: WorkflowTaskService;
	workflowId: string;
	result: ExecutionRunResult;
	analysis: VerificationAnalysis;
	/** Running count of verify runs for this build, used to enforce MAX_VERIFY_ATTEMPTS. */
	verifyAttempts: number;
}): Promise<void> {
	const { input, context, workflowTaskService, workflowId, result, analysis, verifyAttempts } =
		args;
	try {
		const executedForEvidence = namesOrDataKeys(analysis.reachedNames, result.data);
		await workflowTaskService.updateBuildOutcome(input.workItemId, {
			verifyAttempts,
			verification: {
				attempted: true,
				success: analysis.success,
				executionId: result.executionId || undefined,
				status: result.status,
				failureSignature: analysis.success ? undefined : analysis.errorMessage,
				evidence: {
					nodesExecuted:
						executedForEvidence && executedForEvidence.length > 0 ? executedForEvidence : undefined,
					nodesNotReached:
						analysis.nodesNotReached.length > 0 ? analysis.nodesNotReached : undefined,
					producedOutputRows: countProducedOutputRows(result.data),
					errorNodeName: analysis.success ? undefined : analysis.nodeErrors[0]?.nodeName,
					errorMessage: analysis.success ? undefined : analysis.errorMessage,
					nodeErrors: analysis.nodeErrors.length > 0 ? analysis.nodeErrors : undefined,
				},
				verifiedAt: new Date().toISOString(),
			},
		});
	} catch {
		// intentional: verification record persistence is advisory
	}

	if (analysis.remediation && !analysis.remediation.shouldEdit) {
		await reportTerminalRemediation({
			input,
			context,
			workflowTaskService,
			workflowId,
			executionId: result.executionId || undefined,
			remediation: analysis.remediation,
		});
	}
}

async function reportTerminalRemediation(args: {
	input: ResolvedVerifyInput;
	context: OrchestrationContext;
	workflowTaskService: WorkflowTaskService;
	workflowId: string;
	executionId: string | undefined;
	remediation: RemediationMetadata;
}): Promise<void> {
	const { input, context, workflowTaskService, workflowId, executionId, remediation } = args;
	try {
		await workflowTaskService.reportVerificationVerdict({
			workItemId: input.workItemId,
			runId: context.runId,
			workflowId,
			executionId,
			verdict: remediation.category === 'needs_setup' ? 'needs_user_input' : 'failed_terminal',
			failureSignature: remediation.reason,
			diagnosis: remediation.guidance,
			remediation,
			summary: remediation.guidance,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to persist terminal verdict', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	try {
		context.trackTelemetry?.('Builder remediation guard fired', {
			thread_id: context.threadId,
			run_id: context.runId,
			work_item_id: input.workItemId,
			workflow_id: workflowId,
			category: remediation.category,
			attempt_count: remediation.attemptCount,
			reason: remediation.reason,
		});
	} catch (error) {
		context.logger.warn('verify-built-workflow: failed to emit remediation telemetry', {
			workItemId: input.workItemId,
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
