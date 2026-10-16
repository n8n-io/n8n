import { MAX_VERIFY_ATTEMPTS } from './remediation';
import {
	setupRemediationBlocksVerification,
	stateForPendingSetupVerification,
} from './setup-verification-policy';
import { getMultiTriggerCoverage } from './verification-progress';
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
	setupPanelEnabled?: boolean;
}

/** Blocking-reason text for one-off builds whose verification is optional. */
const ONE_OFF_VERIFICATION_GUIDANCE =
	'One-off operation: verification is an optional pre-flight. Completion is a live run ' +
	'whose actual node output was read back.';

const UNSETTLED_OBLIGATION_STATUSES = new Set<WorkflowVerificationObligationStatus>([
	'pending_build',
	'ready_to_verify',
	'verifying',
]);

type MultiTriggerCoverage = ReturnType<typeof getMultiTriggerCoverage>;

function hasSuccessfulEvidence(
	outcome: WorkflowBuildOutcome,
	coverage: MultiTriggerCoverage,
): boolean {
	if (coverage) {
		return (
			coverage.allTriggersPassed &&
			coverage.nodesNotReached.length === 0 &&
			!hasFailedEvidence(outcome)
		);
	}

	const nodesNotReached = outcome.verification?.evidence?.nodesNotReached;
	return (
		outcome.verification?.attempted === true &&
		outcome.verification.success &&
		!!outcome.verification.executionId &&
		(nodesNotReached === undefined || nodesNotReached.length === 0)
	);
}

function hasPartialSuccessfulCoverageEvidence(
	outcome: WorkflowBuildOutcome,
	coverage: MultiTriggerCoverage,
): boolean {
	if (coverage) {
		return coverage.allTriggersPassed && coverage.nodesNotReached.length > 0;
	}
	return (
		outcome.verification?.attempted === true &&
		outcome.verification.success &&
		(outcome.verification.evidence?.nodesNotReached?.length ?? 0) > 0
	);
}

function hasFailedEvidence(outcome: WorkflowBuildOutcome): boolean {
	return outcome.verification?.attempted === true && !outcome.verification.success;
}

function hasSetupBlockingEvidence(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome,
): boolean {
	if (outcome.verificationReadiness?.status === 'needs_setup') return true;
	if (setupRemediationBlocksVerification(outcome.remediation, outcome)) return true;
	if (setupRemediationBlocksVerification(state.lastRemediation, outcome)) return true;

	return outcome.setupRequirement?.status === 'required' && hasFailedEvidence(outcome);
}

function deriveStatus(
	state: WorkflowLoopState,
	outcome: WorkflowBuildOutcome | undefined,
	coverage: MultiTriggerCoverage,
): WorkflowVerificationObligationStatus {
	if (!outcome) return 'pending_build';

	if (!outcome.submitted) return 'blocked';
	if (hasSuccessfulEvidence(outcome, coverage)) return 'verified';
	if (hasSetupBlockingEvidence(state, outcome)) return 'needs_setup';
	if (hasPartialSuccessfulCoverageEvidence(outcome, coverage)) return 'not_verifiable';
	// Keep tracked multi-trigger failures open so another trigger can contribute.
	// The attempt limit below bounds these retries.
	if (hasFailedEvidence(outcome) && !coverage) return 'not_verifiable';

	// One-off builds: verification is optional, so the obligation settles
	// immediately (after the evidence checks above, which still win). This must
	// stay an explicit settled return — falling through to `ready_to_verify`
	// would make the planned scheduler re-issue verification follow-ups forever
	// for one-off builds. A blocked loop state still surfaces as blocked;
	// 'blocked' is itself settled, so loop-safety holds either way.
	if (outcome.executionIntent === 'one-off') {
		return state.status === 'blocked' ? 'blocked' : 'not_verifiable';
	}
	if ((outcome.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
		return 'blocked';
	}

	switch (outcome.verificationReadiness?.status) {
		case 'already_verified':
			if (!coverage) return 'verified';
			return state.status === 'blocked' ? 'blocked' : 'ready_to_verify';
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
	coverage: MultiTriggerCoverage,
	status: WorkflowVerificationObligationStatus,
): string | undefined {
	if (!outcome) return undefined;
	if (!outcome.submitted) {
		return (
			outcome.blockingReason ?? outcome.failureSignature ?? 'Builder did not submit a workflow.'
		);
	}
	if (status === 'verified') return undefined;
	if (outcome.verificationReadiness?.status === 'not_verifiable') {
		return outcome.verificationReadiness.guidance;
	}
	if (outcome.verificationReadiness?.status === 'needs_setup') {
		return outcome.verificationReadiness.guidance;
	}
	if (hasPartialSuccessfulCoverageEvidence(outcome, coverage)) {
		if (coverage) {
			return (
				'Automatic verification covered every trigger but did not reach all planned nodes. ' +
				`Unreached nodes need manual testing: ${coverage.nodesNotReached.join(', ')}.`
			);
		}
		const nodesNotReached = outcome.verification?.evidence?.nodesNotReached ?? [];
		return `Automatic verification only covered part of the workflow. Unreached nodes need manual testing: ${nodesNotReached.join(', ')}.`;
	}
	if (hasFailedEvidence(outcome) && !coverage && !hasSetupBlockingEvidence(state, outcome)) {
		const failure =
			outcome.verification?.failureSignature ??
			outcome.verification?.evidence?.errorMessage ??
			'an error during execution';
		const nodesNotReached = outcome.verification?.evidence?.nodesNotReached ?? [];
		const unreached =
			nodesNotReached.length > 0 ? ` Nodes not reached: ${nodesNotReached.join(', ')}.` : '';
		return `Automatic verification failed with: ${failure}. Re-running it will reproduce the same failure — explain this blocker to the user and have them resolve it (e.g. configure credentials or fix the data) before verifying manually.${unreached}`;
	}
	if (status === 'blocked' && (outcome.verifyAttempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
		return (
			'Automatic verification reached its attempt limit. ' +
			'Report the remaining coverage. Ask the user to test the remaining nodes manually.'
		);
	}
	const outcomeRemediation = outcome.remediation;
	if (outcomeRemediation && setupRemediationBlocksVerification(outcomeRemediation, outcome)) {
		return outcomeRemediation.guidance;
	}
	const lastRemediation = state.lastRemediation;
	if (lastRemediation && setupRemediationBlocksVerification(lastRemediation, outcome)) {
		return lastRemediation.guidance;
	}
	if (outcome.setupRequirement?.status === 'required' && hasFailedEvidence(outcome)) {
		return outcome.setupRequirement.guidance;
	}
	// After the evidence checks: a one-off may have run an optional pre-flight
	// verify, and a concrete failure message outranks the generic guidance. A
	// verified one-off carries no blockingReason at all — nothing is blocked.
	if (outcome.executionIntent === 'one-off') {
		return ONE_OFF_VERIFICATION_GUIDANCE;
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
	const savedOutcome = record.lastBuildOutcome;
	const setupVerificationState =
		options.setupPanelEnabled === true && savedOutcome
			? stateForPendingSetupVerification(record.state, savedOutcome)
			: undefined;
	const outcome: WorkflowBuildOutcome | undefined =
		setupVerificationState && savedOutcome
			? { ...savedOutcome, verificationReadiness: { status: 'ready' } }
			: savedOutcome;
	const state = setupVerificationState ?? record.state;
	const coverage = getMultiTriggerCoverage(outcome);
	const status = deriveStatus(state, outcome, coverage);
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
		executionIntent: outcome?.executionIntent,
		blockingReason: deriveBlockingReason(state, outcome, coverage, status),
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
