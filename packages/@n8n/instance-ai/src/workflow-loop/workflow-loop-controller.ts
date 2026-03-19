/**
 * Workflow Loop Controller
 *
 * Pure functions that compute state transitions for the workflow build/verify loop.
 * No IO, no side effects — the caller (service) handles persistence and execution.
 *
 * Six phases: building → verifying → repairing → done | failed | blocked
 *
 * Retry policy:
 * - At most 3 failed verification attempts per work item
 * - Repeat patch verdicts for the same failure signature escalate to rebuild
 * - Block only when user input is required or the build cannot proceed
 */

import { nanoid } from 'nanoid';

import type {
	AttemptRecord,
	WorkflowBuildOutcome,
	WorkflowLoopAction,
	WorkflowLoopSource,
	WorkflowLoopState,
	VerificationResult,
} from './workflow-loop-state';

const MAX_VERIFICATION_FAILURES = 3;

// ── Work item creation ──────────────────────────────────────────────────────

export function createWorkItem(
	threadId: string,
	source: WorkflowLoopSource,
	workflowId?: string,
): WorkflowLoopState {
	return {
		workItemId: `wi_${nanoid(8)}`,
		threadId,
		workflowId,
		phase: 'building',
		status: 'active',
		source,
		patchAttempts: 0,
		rebuildAttempts: 0,
	};
}

// ── Build outcome handling ──────────────────────────────────────────────────

interface TransitionResult {
	state: WorkflowLoopState;
	action: WorkflowLoopAction;
	attempt: AttemptRecord;
}

export function handleBuildOutcome(
	state: WorkflowLoopState,
	attempts: AttemptRecord[],
	outcome: WorkflowBuildOutcome,
): TransitionResult {
	const attempt = makeAttempt(state, 'build', attempts);

	if (!outcome.submitted) {
		attempt.result = outcome.needsUserInput ? 'blocked' : 'failure';
		attempt.failureSignature = outcome.failureSignature;

		const reason =
			outcome.blockingReason ?? outcome.failureSignature ?? 'Builder failed to submit workflow';
		return {
			state: { ...state, phase: 'blocked', status: 'blocked', lastTaskId: outcome.taskId },
			action: { type: 'blocked', reason },
			attempt,
		};
	}

	// Submitted successfully
	attempt.result = 'success';
	attempt.workflowId = outcome.workflowId;
	const mockedCredentialTypes =
		outcome.mockedCredentialTypes && outcome.mockedCredentialTypes.length > 0
			? outcome.mockedCredentialTypes
			: undefined;
	const updatedState: WorkflowLoopState = {
		...state,
		workflowId: outcome.workflowId ?? state.workflowId,
		lastTaskId: outcome.taskId,
		mockedCredentialTypes: mockedCredentialTypes ?? state.mockedCredentialTypes,
	};

	if (outcome.triggerType === 'trigger_only') {
		return {
			state: { ...updatedState, phase: 'done', status: 'completed' },
			action: {
				type: 'done',
				workflowId: outcome.workflowId,
				summary: outcome.summary,
				mockedCredentialTypes,
			},
			attempt,
		};
	}

	if (outcome.needsUserInput) {
		return {
			state: { ...updatedState, phase: 'blocked', status: 'blocked' },
			action: { type: 'blocked', reason: outcome.blockingReason ?? 'Needs user input' },
			attempt,
		};
	}

	// Manual/testable workflow — proceed to verification
	return {
		state: { ...updatedState, phase: 'verifying', status: 'active' },
		action: { type: 'verify', workflowId: outcome.workflowId! },
		attempt,
	};
}

// ── Verification verdict handling ───────────────────────────────────────────

export function handleVerificationVerdict(
	state: WorkflowLoopState,
	attempts: AttemptRecord[],
	verdict: VerificationResult,
): TransitionResult {
	const attempt = makeAttempt(state, 'verify', attempts);
	attempt.executionId = verdict.executionId;
	attempt.failureSignature = verdict.failureSignature;
	attempt.diagnosis = verdict.diagnosis;
	const nextVerificationFailureCount = countVerificationFailures(attempts) + 1;

	switch (verdict.verdict) {
		case 'verified': {
			attempt.result = 'success';
			return {
				state: {
					...state,
					phase: 'done',
					status: 'completed',
					lastExecutionId: verdict.executionId,
				},
				action: {
					type: 'done',
					workflowId: verdict.workflowId,
					summary: verdict.summary,
					mockedCredentialTypes: state.mockedCredentialTypes,
				},
				attempt,
			};
		}

		case 'trigger_only': {
			attempt.result = 'success';
			return {
				state: { ...state, phase: 'done', status: 'completed' },
				action: {
					type: 'done',
					workflowId: verdict.workflowId,
					summary: verdict.summary,
					mockedCredentialTypes: state.mockedCredentialTypes,
				},
				attempt,
			};
		}

		case 'needs_user_input': {
			attempt.result = 'blocked';
			return {
				state: { ...state, phase: 'blocked', status: 'blocked' },
				action: { type: 'blocked', reason: verdict.diagnosis ?? 'Needs user input' },
				attempt,
			};
		}

		case 'failed_terminal': {
			attempt.result = 'failure';
			if (nextVerificationFailureCount >= MAX_VERIFICATION_FAILURES) {
				return failPhase(state, verdict, attempt, verdict.summary);
			}

			return escalateToRebuild(state, verdict, attempt);
		}

		case 'needs_patch': {
			attempt.result = 'failure';
			if (nextVerificationFailureCount >= MAX_VERIFICATION_FAILURES) {
				return failPhase(state, verdict, attempt);
			}

			if (
				verdict.failureSignature &&
				hasRepeatedRepair(attempts, verdict.failureSignature, 'patch')
			) {
				return escalateToRebuild(state, verdict, attempt);
			}

			if (!verdict.failedNodeName || !verdict.patch) {
				return escalateToRebuild(state, verdict, attempt);
			}

			return {
				state: {
					...state,
					phase: 'repairing',
					status: 'active',
					patchAttempts: state.patchAttempts + 1,
					lastFailureSignature: verdict.failureSignature,
					lastExecutionId: verdict.executionId,
				},
				action: {
					type: 'patch',
					workflowId: verdict.workflowId,
					nodeName: verdict.failedNodeName,
					patch: verdict.patch,
				},
				attempt,
			};
		}

		case 'needs_rebuild': {
			attempt.result = 'failure';
			if (nextVerificationFailureCount >= MAX_VERIFICATION_FAILURES) {
				return failPhase(state, verdict, attempt);
			}

			return escalateToRebuild(state, verdict, attempt);
		}
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function failPhase(
	state: WorkflowLoopState,
	verdict: VerificationResult,
	attempt: AttemptRecord,
	reason = verdict.summary,
): TransitionResult {
	return {
		state: {
			...state,
			phase: 'failed',
			status: 'completed',
			lastFailureSignature: verdict.failureSignature,
			lastExecutionId: verdict.executionId,
		},
		action: {
			type: 'failed',
			workflowId: verdict.workflowId,
			reason,
		},
		attempt,
	};
}

function escalateToRebuild(
	state: WorkflowLoopState,
	verdict: VerificationResult,
	attempt: AttemptRecord,
): TransitionResult {
	const failureDetails = [
		verdict.diagnosis ?? '',
		verdict.failedNodeName ? `Failed node: ${verdict.failedNodeName}` : '',
		verdict.failureSignature ? `Signature: ${verdict.failureSignature}` : '',
	]
		.filter(Boolean)
		.join('. ');

	return {
		state: {
			...state,
			phase: 'repairing',
			status: 'active',
			rebuildAttempts: state.rebuildAttempts + 1,
			lastFailureSignature: verdict.failureSignature,
			lastExecutionId: verdict.executionId,
		},
		action: {
			type: 'rebuild',
			workflowId: verdict.workflowId,
			failureDetails: failureDetails || verdict.summary,
		},
		attempt,
	};
}

function countVerificationFailures(attempts: AttemptRecord[]): number {
	return attempts.filter((attempt) => attempt.action === 'verify' && attempt.result === 'failure')
		.length;
}

/**
 * Check if we've already attempted the same repair mode for the same failure signature.
 * Repeated targeted patches should escalate to a rebuild instead of patching forever.
 */
function hasRepeatedRepair(
	attempts: AttemptRecord[],
	failureSignature: string,
	repairMode: 'patch',
): boolean {
	return attempts.some((a) => a.action === repairMode && a.failureSignature === failureSignature);
}

function makeAttempt(
	state: WorkflowLoopState,
	action: AttemptRecord['action'],
	attempts: AttemptRecord[],
): AttemptRecord {
	const workItemAttempts = attempts.filter((a) => a.workItemId === state.workItemId);
	return {
		workItemId: state.workItemId,
		phase: state.phase,
		attempt: workItemAttempts.length + 1,
		action,
		result: 'success', // caller overrides on failure
		createdAt: new Date().toISOString(),
	};
}

/**
 * Format attempt records as a condensed summary for builder briefings.
 * Replaces the iteration-log formatting with structured data.
 */
export function formatAttemptHistory(attempts: AttemptRecord[]): string {
	if (attempts.length === 0) return '';

	const lines = attempts.map((a) => {
		let line = `Attempt ${a.attempt} [${a.action}]: ${a.result}`;
		if (a.failureSignature) line += ` — ${a.failureSignature}`;
		if (a.diagnosis) line += ` | ${a.diagnosis}`;
		if (a.fixApplied) line += ` | Fix: ${a.fixApplied}`;
		return line;
	});

	return `<previous-attempts>\n${lines.join('\n')}\n</previous-attempts>`;
}
