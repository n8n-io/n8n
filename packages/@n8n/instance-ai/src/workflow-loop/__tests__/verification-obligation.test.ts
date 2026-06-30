import { createRemediation } from '../remediation';
import {
	deriveWorkflowVerificationObligation,
	deriveWorkflowVerificationObligationFromOutcome,
} from '../verification-obligation';
import type {
	AttemptRecord,
	WorkflowBuildOutcome,
	WorkflowLoopState,
} from '../workflow-loop-state';

function makeState(overrides: Partial<WorkflowLoopState> = {}): WorkflowLoopState {
	return {
		workItemId: 'wi-1',
		threadId: 'thread-1',
		runId: 'run-1',
		workflowId: 'wf-1',
		phase: 'verifying',
		status: 'active',
		source: 'create',
		rebuildAttempts: 0,
		...overrides,
	};
}

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
	return {
		workItemId: 'wi-1',
		phase: 'building',
		attempt: 1,
		action: 'build',
		result: 'success',
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi-1',
		runId: 'run-1',
		taskId: 'build-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		verificationReadiness: { status: 'ready' },
		setupRequirement: { status: 'not_required' },
		summary: 'Submitted.',
		...overrides,
	};
}

describe('deriveWorkflowVerificationObligation', () => {
	it('marks ready build outcomes as ready to verify', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome(),
		});

		expect(obligation).toEqual(
			expect.objectContaining({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				status: 'ready_to_verify',
				policy: 'required',
				updatedAt: '2026-01-01T00:00:00.000Z',
			}),
		);
	});

	it('does not let setup remediation preempt ready-to-verify builds', () => {
		const setupRemediation = createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance: 'Route through setup.',
		});
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState({ lastRemediation: setupRemediation }),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				hasUnresolvedPlaceholders: true,
				remediation: setupRemediation,
				setupRequirement: {
					status: 'required',
					reason: 'unresolved-placeholders',
					guidance: 'Route through setup.',
				},
				verificationReadiness: { status: 'ready' },
			}),
		});

		expect(obligation.status).toBe('ready_to_verify');
		expect(obligation.blockingReason).toBeUndefined();
	});

	it('marks successful structured evidence as verified', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				verificationReadiness: { status: 'already_verified' },
				verification: {
					attempted: true,
					success: true,
					executionId: 'exec-1',
					status: 'success',
				},
			}),
		});

		expect(obligation.status).toBe('verified');
		expect(obligation.evidence?.executionId).toBe('exec-1');
	});

	it('treats partial-coverage evidence as a manual warning completion', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				verification: {
					attempted: true,
					success: true,
					executionId: 'exec-1',
					status: 'success',
					evidence: { nodesNotReached: ['Send Email'] },
				},
			}),
		});

		expect(obligation.status).toBe('not_verifiable');
		expect(obligation.policy).toBe('manual');
		expect(obligation.blockingReason).toContain('Send Email');
	});

	it('settles failed verification evidence as a manual completion instead of looping', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				// Readiness "ready" + setup "not_required" is the production shape that
				// previously fell through to ready_to_verify and re-issued forever.
				verificationReadiness: { status: 'ready' },
				setupRequirement: { status: 'not_required' },
				verification: {
					attempted: true,
					success: false,
					executionId: 'exec-1',
					status: 'error',
					failureSignature:
						'Error in sub-node Google Gemini — Node does not have any credentials set',
					evidence: { nodesNotReached: ['Send Bug Report Email'] },
				},
			}),
		});

		expect(obligation.status).toBe('not_verifiable');
		expect(obligation.policy).toBe('manual');
		expect(obligation.blockingReason).toContain('Node does not have any credentials set');
		expect(obligation.blockingReason).toContain('Send Bug Report Email');
	});

	it('treats not-verifiable outcomes as manual warning completions', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				verificationReadiness: {
					status: 'not_verifiable',
					reason: 'non-mockable-trigger',
					guidance: 'Ask the user to test manually.',
				},
			}),
		});

		expect(obligation.status).toBe('not_verifiable');
		expect(obligation.policy).toBe('manual');
		expect(obligation.blockingReason).toBe('Ask the user to test manually.');
	});

	it('preserves setup handoff status when the loop state is blocked for setup', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState({ phase: 'blocked', status: 'blocked' }),
			attempts: [makeAttempt({ result: 'blocked' })],
			lastBuildOutcome: makeOutcome({
				needsUserInput: true,
				blockingReason: 'Setup required.',
				verificationReadiness: {
					status: 'needs_setup',
					reason: 'unresolved-placeholders',
					guidance: 'Route through setup.',
				},
				setupRequirement: {
					status: 'required',
					reason: 'unresolved-placeholders',
					guidance: 'Route through setup.',
				},
			}),
		});

		expect(obligation.status).toBe('needs_setup');
		expect(obligation.blockingReason).toBe('Route through setup.');
	});

	it('treats failed verification evidence with required setup as needs setup', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState(),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({
				setupRequirement: {
					status: 'required',
					reason: 'mocked-credentials',
					guidance: 'Route through setup.',
				},
				verification: {
					attempted: true,
					success: false,
					executionId: 'exec-1',
					status: 'error',
					failureSignature: 'Missing credentials',
				},
			}),
		});

		expect(obligation.status).toBe('needs_setup');
		expect(obligation.blockingReason).toBe('Route through setup.');
	});

	it('marks missing submit as blocked', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState({ workflowId: undefined }),
			attempts: [makeAttempt({ result: 'failure' })],
			lastBuildOutcome: makeOutcome({
				workflowId: undefined,
				submitted: false,
				verificationReadiness: {
					status: 'not_verifiable',
					reason: 'not-submitted',
					guidance: 'Nothing to verify.',
				},
				failureSignature: 'submit failed',
			}),
		});

		expect(obligation.status).toBe('blocked');
		expect(obligation.blockingReason).toBe('submit failed');
	});

	it('derives planned ownership from the workflow-loop state', () => {
		const obligation = deriveWorkflowVerificationObligation('thread-1', {
			state: makeState({ plannedTaskId: 'planned-1' }),
			attempts: [makeAttempt()],
			lastBuildOutcome: makeOutcome({ verificationReadiness: { status: 'ready' } }),
		});

		expect(obligation).toEqual(
			expect.objectContaining({
				owner: { type: 'planned', taskId: 'planned-1' },
				source: 'planned',
				plannedTaskId: 'planned-1',
			}),
		);
	});
});

describe('deriveWorkflowVerificationObligationFromOutcome', () => {
	it('derives the same obligation as a synthetic loop record', () => {
		const obligation = deriveWorkflowVerificationObligationFromOutcome(
			'thread-1',
			makeOutcome({ verificationReadiness: { status: 'ready' } }),
			{ source: 'planned', plannedTaskId: 'task-1' },
		);

		expect(obligation).toEqual(
			expect.objectContaining({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				owner: { type: 'planned', taskId: 'task-1' },
				source: 'planned',
				plannedTaskId: 'task-1',
				status: 'ready_to_verify',
				policy: 'required',
			}),
		);
	});

	it('marks already-verified outcomes as verified', () => {
		const obligation = deriveWorkflowVerificationObligationFromOutcome(
			'thread-1',
			makeOutcome({
				verificationReadiness: { status: 'already_verified' },
				verification: { attempted: true, success: true, executionId: 'exec-1', status: 'success' },
			}),
		);

		expect(obligation.status).toBe('verified');
		expect(obligation.evidence?.executionId).toBe('exec-1');
	});

	it('treats partial already-verified outcomes as manual warning completions', () => {
		const obligation = deriveWorkflowVerificationObligationFromOutcome(
			'thread-1',
			makeOutcome({
				verificationReadiness: { status: 'already_verified' },
				verification: {
					attempted: true,
					success: true,
					executionId: 'exec-1',
					status: 'success',
					evidence: { nodesNotReached: ['Send Email'] },
				},
			}),
		);

		expect(obligation.status).toBe('not_verifiable');
		expect(obligation.policy).toBe('manual');
		expect(obligation.blockingReason).toContain('Send Email');
	});

	it('settles failed verification evidence as manual from outcome-only records', () => {
		const obligation = deriveWorkflowVerificationObligationFromOutcome(
			'thread-1',
			makeOutcome({
				verificationReadiness: { status: 'ready' },
				setupRequirement: { status: 'not_required' },
				verification: {
					attempted: true,
					success: false,
					executionId: 'exec-1',
					status: 'error',
					failureSignature: 'Sheet with name Registrations not found',
				},
			}),
			{ source: 'planned', plannedTaskId: 'task-1' },
		);

		expect(obligation.status).toBe('not_verifiable');
		expect(obligation.policy).toBe('manual');
		expect(obligation.blockingReason).toContain('Sheet with name Registrations not found');
		expect(obligation.plannedTaskId).toBe('task-1');
	});

	it('marks setup-blocked failed evidence as needs setup from outcome-only records', () => {
		const obligation = deriveWorkflowVerificationObligationFromOutcome(
			'thread-1',
			makeOutcome({
				setupRequirement: {
					status: 'required',
					reason: 'mocked-credentials',
					guidance: 'Route through setup.',
				},
				verification: {
					attempted: true,
					success: false,
					executionId: 'exec-1',
					status: 'error',
					failureSignature: 'Missing credentials',
				},
			}),
			{ source: 'planned', plannedTaskId: 'task-1' },
		);

		expect(obligation.status).toBe('needs_setup');
		expect(obligation.plannedTaskId).toBe('task-1');
	});
});
