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

import {
	MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
	MAX_PRE_SAVE_SUBMIT_FAILURES,
	createRemediation,
	remainingPostSubmitRemediations,
} from './remediation';
import type {
	AttemptRecord,
	RemediationMetadata,
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
	runId?: string,
): WorkflowLoopState {
	return {
		workItemId: `wi_${nanoid(8)}`,
		threadId,
		runId,
		workflowId,
		phase: 'building',
		status: 'active',
		source,
		rebuildAttempts: 0,
		preSaveSubmitFailures: 0,
		postSubmitRemediationSubmitsUsed: 0,
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
	if (isStaleRunReport(state, outcome.runId)) {
		const attempt = makeAttempt(state, 'build', attempts);
		attempt.result = 'failure';
		return {
			state,
			action: { type: 'ignored', reason: staleRunReportReason(state.runId, outcome.runId) },
			attempt,
		};
	}

	const normalizedState = state;
	const attempt = makeAttempt(normalizedState, 'build', attempts);
	const isRepairSubmit = Boolean(normalizedState.successfulSubmitSeen);
	const postSubmitRemediationSubmitsUsed = isRepairSubmit
		? (normalizedState.postSubmitRemediationSubmitsUsed ?? 0) + 1
		: (normalizedState.postSubmitRemediationSubmitsUsed ?? 0);
	const remainingSubmitFixes = Math.max(
		0,
		MAX_POST_SUBMIT_REMEDIATION_SUBMITS - postSubmitRemediationSubmitsUsed,
	);
	const remediation = withRemainingSubmitFixes(outcome.remediation, remainingSubmitFixes);
	applyRemediationToAttempt(attempt, remediation);

	if (!outcome.submitted) {
		const preSaveSubmitFailures = normalizedState.successfulSubmitSeen
			? (normalizedState.preSaveSubmitFailures ?? 0)
			: (normalizedState.preSaveSubmitFailures ?? 0) + 1;
		const preSaveBudgetExhausted =
			!normalizedState.successfulSubmitSeen &&
			preSaveSubmitFailures >= MAX_PRE_SAVE_SUBMIT_FAILURES;
		const postSubmitBudgetExhausted =
			normalizedState.successfulSubmitSeen &&
			postSubmitRemediationSubmitsUsed >= MAX_POST_SUBMIT_REMEDIATION_SUBMITS;
		let terminalRemediation = remediation;
		if (preSaveBudgetExhausted && remediation?.shouldEdit !== false) {
			terminalRemediation = createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'pre_save_submit_budget_exhausted',
				attemptCount: preSaveSubmitFailures,
				remainingSubmitFixes: 0,
				guidance:
					'The workflow could not be saved after three submit attempts. Stop editing and explain the blocker to the user.',
			});
		} else if (postSubmitBudgetExhausted && remediation?.shouldEdit !== false) {
			terminalRemediation = createRemediation({
				category: 'blocked',
				shouldEdit: false,
				reason: 'post_submit_budget_exhausted',
				attemptCount: postSubmitRemediationSubmitsUsed,
				remainingSubmitFixes: 0,
				guidance:
					'The workflow was saved, but the automatic repair budget is exhausted. Stop editing and explain the blocker to the user.',
			});
		}
		applyRemediationToAttempt(attempt, terminalRemediation);
		attempt.result =
			outcome.needsUserInput || terminalRemediation?.shouldEdit === false ? 'blocked' : 'failure';
		attempt.failureSignature = outcome.failureSignature;

		const reason =
			terminalRemediation?.guidance ??
			outcome.blockingReason ??
			outcome.failureSignature ??
			'Builder failed to submit workflow';
		const nextState: WorkflowLoopState = {
			...normalizedState,
			lastTaskId: outcome.taskId,
			preSaveSubmitFailures,
			postSubmitRemediationSubmitsUsed,
			lastRemediation: terminalRemediation ?? normalizedState.lastRemediation,
		};
		return {
			state:
				outcome.needsUserInput || terminalRemediation?.shouldEdit === false
					? { ...nextState, phase: 'blocked', status: 'blocked' }
					: nextState,
			action:
				outcome.needsUserInput || terminalRemediation?.shouldEdit === false
					? { type: 'blocked', reason }
					: { type: 'continue_building', reason },
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
		...normalizedState,
		workflowId: outcome.workflowId ?? normalizedState.workflowId,
		lastTaskId: outcome.taskId,
		mockedCredentialTypes: mockedCredentialTypes ?? normalizedState.mockedCredentialTypes,
		hasUnresolvedPlaceholders:
			hasUnresolvedPlaceholders ?? normalizedState.hasUnresolvedPlaceholders,
		successfulSubmitSeen: true,
		preSaveSubmitFailures: normalizedState.successfulSubmitSeen
			? (normalizedState.preSaveSubmitFailures ?? 0)
			: 0,
		postSubmitRemediationSubmitsUsed,
		lastRemediation: remediation,
	};

	if (outcome.needsUserInput) {
		return {
			state: { ...updatedState, phase: 'blocked', status: 'blocked' },
			action: { type: 'blocked', reason: outcome.blockingReason ?? 'Needs user input' },
			attempt,
		};
	}

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
	if (isStaleRunReport(state, verdict.runId)) {
		const attempt = makeAttempt(state, 'verify', attempts);
		attempt.result = 'failure';
		return {
			state,
			action: { type: 'ignored', reason: staleRunReportReason(state.runId, verdict.runId) },
			attempt,
		};
	}

	const normalizedState = state;
	const attempt = makeAttempt(normalizedState, 'verify', attempts);
	attempt.executionId = verdict.executionId;
	attempt.failureSignature = verdict.failureSignature;
	attempt.diagnosis = verdict.diagnosis;
	const remediation = withRemainingSubmitFixes(
		verdict.remediation,
		remainingPostSubmitRemediations(normalizedState),
	);
	applyRemediationToAttempt(attempt, remediation);

	if (remediation && !remediation.shouldEdit) {
		attempt.result = 'blocked';
		return {
			state: {
				...normalizedState,
				phase: 'blocked',
				status: 'blocked',
				lastExecutionId: verdict.executionId,
				lastFailureSignature: verdict.failureSignature,
				lastRemediation: remediation,
			},
			action: { type: 'blocked', reason: remediation.guidance },
			attempt,
		};
	}

	switch (verdict.verdict) {
		case 'verified': {
			attempt.result = 'success';
			return {
				state: {
					...normalizedState,
					phase: 'done',
					status: 'completed',
					lastExecutionId: verdict.executionId,
					lastRemediation: remediation,
				},
				action: {
					type: 'done',
					workflowId: verdict.workflowId,
					summary: verdict.summary,
					mockedCredentialTypes: normalizedState.mockedCredentialTypes,
					hasUnresolvedPlaceholders: normalizedState.hasUnresolvedPlaceholders,
				},
				attempt,
			};
		}

		case 'trigger_only': {
			attempt.result = 'success';
			return {
				state: {
					...normalizedState,
					phase: 'done',
					status: 'completed',
					lastRemediation: remediation,
				},
				action: {
					type: 'done',
					workflowId: verdict.workflowId,
					summary: verdict.summary,
					mockedCredentialTypes: normalizedState.mockedCredentialTypes,
					hasUnresolvedPlaceholders: normalizedState.hasUnresolvedPlaceholders,
				},
				attempt,
			};
		}

		case 'needs_user_input': {
			attempt.result = 'blocked';
			return {
				state: {
					...normalizedState,
					phase: 'blocked',
					status: 'blocked',
					lastRemediation: remediation,
				},
				action: { type: 'blocked', reason: verdict.diagnosis ?? 'Needs user input' },
				attempt,
			};
		}

		case 'failed_terminal': {
			attempt.result = 'failure';
			return {
				state: {
					...normalizedState,
					phase: 'blocked',
					status: 'blocked',
					lastFailureSignature: verdict.failureSignature,
					lastRemediation: remediation,
				},
				action: { type: 'blocked', reason: verdict.summary },
				attempt,
			};
		}

		case 'needs_patch': {
			attempt.result = 'failure';
			attempt.action = 'patch';
			return escalateToRepair(normalizedState, attempts, verdict, attempt, remediation, {
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

			return escalateToRepair(normalizedState, attempts, verdict, attempt, remediation, {
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
	remediation: RemediationMetadata | undefined,
	action: WorkflowLoopAction,
): TransitionResult {
	// Check retry policy: only 1 repair (patch or rebuild) per unique failureSignature
	if (verdict.failureSignature && hasRepeatedRepair(attempts, verdict.failureSignature)) {
		const blockedRemediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'duplicate_failure_signature',
			attemptCount: state.postSubmitRemediationSubmitsUsed ?? 0,
			remainingSubmitFixes: remainingPostSubmitRemediations(state),
			guidance: `Repeated repair failure: ${verdict.failureSignature}`,
		});
		applyRemediationToAttempt(attempt, blockedRemediation);
		return {
			state: {
				...state,
				phase: 'blocked',
				status: 'blocked',
				lastFailureSignature: verdict.failureSignature,
				lastRemediation: blockedRemediation,
			},
			action: {
				type: 'blocked',
				reason: `Repeated repair failure: ${verdict.failureSignature}`,
			},
			attempt,
		};
	}

	if ((state.postSubmitRemediationSubmitsUsed ?? 0) >= MAX_POST_SUBMIT_REMEDIATION_SUBMITS) {
		const blockedRemediation = createRemediation({
			category: 'blocked',
			shouldEdit: false,
			reason: 'post_submit_budget_exhausted',
			attemptCount: state.postSubmitRemediationSubmitsUsed ?? 0,
			remainingSubmitFixes: 0,
			guidance:
				'The workflow was saved, but the automatic repair budget is exhausted. Stop editing and explain the blocker to the user.',
		});
		applyRemediationToAttempt(attempt, blockedRemediation);
		return {
			state: {
				...state,
				phase: 'blocked',
				status: 'blocked',
				lastFailureSignature: verdict.failureSignature,
				lastRemediation: blockedRemediation,
			},
			action: {
				type: 'blocked',
				reason: blockedRemediation.guidance,
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
			lastRemediation: remediation,
		},
		action,
		attempt,
	};
}

function isStaleRunReport(state: WorkflowLoopState, runId: string | undefined): runId is string {
	return Boolean(runId && state.runId && state.runId !== runId);
}

function staleRunReportReason(stateRunId: string | undefined, reportRunId: string): string {
	return `Ignoring report from stale run "${reportRunId}" for active run "${stateRunId ?? 'unknown'}".`;
}

function withRemainingSubmitFixes(
	remediation: RemediationMetadata | undefined,
	remainingSubmitFixes: number,
): RemediationMetadata | undefined {
	if (!remediation) return undefined;
	return {
		...remediation,
		remainingSubmitFixes,
	};
}

function applyRemediationToAttempt(
	attempt: AttemptRecord,
	remediation: RemediationMetadata | undefined,
): void {
	if (!remediation) return;
	attempt.remediationCategory = remediation.category;
	attempt.remediationShouldEdit = remediation.shouldEdit;
	attempt.remediationGuidance = remediation.guidance;
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
