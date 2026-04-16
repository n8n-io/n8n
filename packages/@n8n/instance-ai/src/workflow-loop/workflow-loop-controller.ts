/**
 * Workflow Loop Controller
 *
 * Pure functions that compute state transitions for the workflow build/verify loop.
 * No IO, no side effects — the caller (service) handles persistence and execution.
 *
 * Five phases: building → verifying → repairing → done | blocked
 *
 * Retry policy:
 * - At most 1 automatic repair (patch or rebuild) per unique failureSignature
 * - Same failureSignature after repair → blocked (no silent loops)
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
	const hasUnresolvedPlaceholders = outcome.hasUnresolvedPlaceholders ?? undefined;
	const updatedState: WorkflowLoopState = {
		...state,
		workflowId: outcome.workflowId ?? state.workflowId,
		lastTaskId: outcome.taskId,
		mockedCredentialTypes: mockedCredentialTypes ?? state.mockedCredentialTypes,
		hasUnresolvedPlaceholders: hasUnresolvedPlaceholders ?? state.hasUnresolvedPlaceholders,
	};

	if (outcome.triggerType === 'trigger_only') {
		return {
			state: { ...updatedState, phase: 'done', status: 'completed' },
			action: {
				type: 'done',
				workflowId: outcome.workflowId,
				summary: outcome.summary,
				mockedCredentialTypes,
				hasUnresolvedPlaceholders: updatedState.hasUnresolvedPlaceholders,
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
					hasUnresolvedPlaceholders: state.hasUnresolvedPlaceholders,
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
					hasUnresolvedPlaceholders: state.hasUnresolvedPlaceholders,
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
			return {
				state: {
					...state,
					phase: 'blocked',
					status: 'blocked',
					lastFailureSignature: verdict.failureSignature,
				},
				action: { type: 'blocked', reason: verdict.summary },
				attempt,
			};
		}

		case 'needs_patch': {
			attempt.result = 'failure';
			attempt.action = 'patch';
			return escalateToRepair(state, attempts, verdict, attempt, {
				type: 'patch',
				workflowId: verdict.workflowId,
				failedNodeName: verdict.failedNodeName ?? 'unknown',
				diagnosis: verdict.diagnosis ?? verdict.summary,
				patch: verdict.patch,
			});
		}

		case 'needs_rebuild': {
			attempt.result = 'failure';
			attempt.action = 'rebuild';

			const failureDetails = [
				verdict.diagnosis ?? '',
				verdict.failedNodeName ? `Failed node: ${verdict.failedNodeName}` : '',
				verdict.failureSignature ? `Signature: ${verdict.failureSignature}` : '',
			]
				.filter(Boolean)
				.join('. ');

			return escalateToRepair(state, attempts, verdict, attempt, {
				type: 'rebuild',
				workflowId: verdict.workflowId,
				failureDetails: failureDetails || verdict.summary,
			});
		}
	}
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escalateToRepair(
	state: WorkflowLoopState,
	attempts: AttemptRecord[],
	verdict: VerificationResult,
	attempt: AttemptRecord,
	action: WorkflowLoopAction,
): TransitionResult {
	// Check retry policy: only 1 repair (patch or rebuild) per unique failureSignature
	if (verdict.failureSignature && hasRepeatedRepair(attempts, verdict.failureSignature)) {
		return {
			state: {
				...state,
				phase: 'blocked',
				status: 'blocked',
				lastFailureSignature: verdict.failureSignature,
			},
			action: {
				type: 'blocked',
				reason: `Repeated repair failure: ${verdict.failureSignature}`,
			},
			attempt,
		};
	}

	return {
		state: {
			...state,
			phase: 'repairing',
			status: 'active',
			rebuildAttempts: state.rebuildAttempts + 1,
			lastFailureSignature: verdict.failureSignature,
			lastExecutionId: verdict.executionId,
		},
		action,
		attempt,
	};
}

/**
 * Check if we've already attempted a repair (patch or rebuild) for the same failure signature.
 * Returns true when a prior repair attempt exists with the same failureSignature,
 * which means we should stop and block to avoid infinite loops.
 */
function hasRepeatedRepair(attempts: AttemptRecord[], failureSignature: string): boolean {
	return attempts.some(
		(a) =>
			(a.action === 'rebuild' || a.action === 'patch') && a.failureSignature === failureSignature,
	);
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
