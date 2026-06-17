import type {
	AttemptRecord,
	WorkflowBuildOwner,
	WorkflowBuildOutcome,
	WorkflowLoopState,
	WorkflowVerificationObligation,
	WorkflowVerificationObligationPolicy,
	WorkflowVerificationObligationSource,
	WorkflowVerificationObligationStatus,
} from './workflow-loop-state';
import {
	plannedTaskIdFromWorkflowBuildOwner,
	resolveWorkflowBuildOwner,
} from './workflow-loop-state';

export interface WorkflowVerificationObligationRecord {
	state: WorkflowLoopState;
	attempts: AttemptRecord[];
	lastBuildOutcome?: WorkflowBuildOutcome;
}

export interface DeriveWorkflowVerificationObligationOptions {
	source?: WorkflowVerificationObligationSource;
	owner?: WorkflowBuildOwner;
	plannedTaskId?: string;
	updatedAt?: string;
}

const UNSETTLED_OBLIGATION_STATUSES = new Set<WorkflowVerificationObligationStatus>([
	'pending_build',
	'ready_to_verify',
	'verifying',
]);

function hasSuccessfulEvidence(outcome: WorkflowBuildOutcome): boolean {
	return (
		outcome.verification?.attempted === true &&
		outcome.verification.success &&
		!!outcome.verification.executionId
	);
}

function hasFailedEvidence(outcome: WorkflowBuildOutcome): boolean {
	return outcome.verification?.attempted === true && !outcome.verification.success;
}

function isNeedsSetupRemediation(remediation: WorkflowBuildOutcome['remediation']): boolean {
	return remediation?.category === 'needs_setup' && !remediation.shouldEdit;
}

function hasSetupBlockingEvidence(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome,
): boolean {
	if (outcome.verificationReadiness?.status === 'needs_setup') return true;
	if (isNeedsSetupRemediation(outcome.remediation)) return true;
	if (isNeedsSetupRemediation(state.lastRemediation)) return true;

	return outcome.setupRequirement?.status === 'required' && hasFailedEvidence(outcome);
}

function deriveStatus(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome | undefined,
): WorkflowVerificationObligationStatus {
	if (!outcome) return 'pending_build';

	if (!outcome.submitted) return 'blocked';
	if (hasSuccessfulEvidence(outcome)) return 'verified';
	if (hasSetupBlockingEvidence(state, outcome)) return 'needs_setup';

	switch (outcome.verificationReadiness?.status) {
		case 'already_verified':
			return 'verified';
		case 'needs_setup':
			return 'needs_setup';
		case 'not_verifiable':
			return 'not_verifiable';
		case 'ready':
			if (state.status === 'blocked') return 'blocked';
			return 'ready_to_verify';
		default:
			if (state.status === 'blocked') return 'blocked';
			return outcome.workflowId ? 'ready_to_verify' : 'blocked';
	}
}

function derivePolicy(
	status: WorkflowVerificationObligationStatus,
	outcome: WorkflowBuildOutcome | undefined,
): WorkflowVerificationObligationPolicy {
	if (status === 'not_verifiable') return 'manual';
	if (outcome?.verificationReadiness?.status === 'not_verifiable') return 'manual';
	return 'required';
}

function deriveBlockingReason(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome | undefined,
): string | undefined {
	if (!outcome) return undefined;
	if (!outcome.submitted) {
		return (
			outcome.blockingReason ?? outcome.failureSignature ?? 'Builder did not submit a workflow.'
		);
	}
	if (outcome.verificationReadiness?.status === 'not_verifiable') {
		return outcome.verificationReadiness.guidance;
	}
	if (outcome.verificationReadiness?.status === 'needs_setup') {
		return outcome.verificationReadiness.guidance;
	}
	const outcomeRemediation = outcome.remediation;
	if (outcomeRemediation?.category === 'needs_setup' && !outcomeRemediation.shouldEdit) {
		return outcomeRemediation.guidance;
	}
	const lastRemediation = state.lastRemediation;
	if (lastRemediation?.category === 'needs_setup' && !lastRemediation.shouldEdit) {
		return lastRemediation.guidance;
	}
	if (outcome.setupRequirement?.status === 'required' && hasFailedEvidence(outcome)) {
		return outcome.setupRequirement.guidance;
	}
	if (state.status === 'blocked') {
		return state.lastRemediation?.guidance ?? outcome.blockingReason ?? outcome.failureSignature;
	}
	return undefined;
}

function lastAttemptTimestamp(attempts: AttemptRecord[]): string | undefined {
	return attempts.at(-1)?.createdAt;
}

export function deriveWorkflowVerificationObligation(
	threadId: string,
	record: WorkflowVerificationObligationRecord,
	options: DeriveWorkflowVerificationObligationOptions = {},
): WorkflowVerificationObligation {
	const outcome = record.lastBuildOutcome;
	const status = deriveStatus(record.state, outcome);
	const updatedAt =
		options.updatedAt ?? lastAttemptTimestamp(record.attempts) ?? new Date().toISOString();
	const owner = resolveWorkflowBuildOwner(options, record.state, outcome);
	const plannedTaskId = plannedTaskIdFromWorkflowBuildOwner(owner);
	const source = options.source ?? owner.type;

	return {
		workItemId: record.state.workItemId,
		threadId,
		runId: outcome?.runId ?? record.state.runId,
		taskId: outcome?.taskId ?? record.state.lastTaskId,
		owner,
		plannedTaskId,
		workflowId: outcome?.workflowId ?? record.state.workflowId,
		source,
		policy: derivePolicy(status, outcome),
		status,
		readiness: outcome?.verificationReadiness,
		setupRequirement: outcome?.setupRequirement,
		evidence: outcome?.verification,
		blockingReason: deriveBlockingReason(record.state, outcome),
		updatedAt,
	};
}

export function isWorkflowVerificationObligationUnsettled(
	obligation: WorkflowVerificationObligation,
): boolean {
	return UNSETTLED_OBLIGATION_STATUSES.has(obligation.status);
}

/**
 * Derive an obligation from a build outcome alone, for callers that have a
 * settled build outcome (e.g. a planned task's recorded outcome) but no live
 * workflow-loop record to read. Backs the obligation with a minimal synthetic
 * state so the same derivation rules apply.
 */
export function deriveWorkflowVerificationObligationFromOutcome(
	threadId: string,
	outcome: WorkflowBuildOutcome,
	options: DeriveWorkflowVerificationObligationOptions = {},
): WorkflowVerificationObligation {
	const state: WorkflowLoopState = {
		workItemId: outcome.workItemId,
		threadId,
		runId: outcome.runId,
		workflowId: outcome.workflowId,
		lastTaskId: outcome.taskId,
		owner: outcome.owner,
		plannedTaskId: outcome.plannedTaskId,
		phase: 'verifying',
		status: 'active',
		source: 'create',
		rebuildAttempts: 0,
	};
	return deriveWorkflowVerificationObligation(
		threadId,
		{ state, attempts: [], lastBuildOutcome: outcome },
		options,
	);
}
