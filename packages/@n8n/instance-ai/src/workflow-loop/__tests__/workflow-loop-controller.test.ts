import {
	createWorkItem,
	handleBuildOutcome,
	handleVerificationVerdict,
	formatAttemptHistory,
} from '../workflow-loop-controller';
import type {
	AttemptRecord,
	WorkflowBuildOutcome,
	WorkflowLoopState,
	VerificationResult,
} from '../workflow-loop-state';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<WorkflowLoopState> = {}): WorkflowLoopState {
	return {
		workItemId: 'wi_test',
		threadId: 'thread_1',
		phase: 'building',
		status: 'active',
		source: 'create',
		rebuildAttempts: 0,
		...overrides,
	};
}

function makeOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_test',
		taskId: 'build_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built workflow',
		...overrides,
	};
}

function makeVerdict(overrides: Partial<VerificationResult> = {}): VerificationResult {
	return {
		workItemId: 'wi_test',
		workflowId: 'wf_123',
		verdict: 'verified',
		summary: 'Execution succeeded',
		...overrides,
	};
}

// ── createWorkItem ──────────────────────────────────────────────────────────

describe('createWorkItem', () => {
	it('creates a new work item with building phase', () => {
		const item = createWorkItem('thread_1', 'create');
		expect(item.phase).toBe('building');
		expect(item.status).toBe('active');
		expect(item.source).toBe('create');
		expect(item.rebuildAttempts).toBe(0);
		expect(item.workItemId).toMatch(/^wi_/);
	});

	it('carries workflowId for modify source', () => {
		const item = createWorkItem('thread_1', 'modify', 'wf_existing');
		expect(item.source).toBe('modify');
		expect(item.workflowId).toBe('wf_existing');
	});
});

// ── handleBuildOutcome ──────────────────────────────────────────────────────

describe('handleBuildOutcome', () => {
	it('transitions to verifying when submitted and testable', () => {
		const state = makeState();
		const outcome = makeOutcome({ workflowId: 'wf_123' });

		const { state: next, action, attempt } = handleBuildOutcome(state, [], outcome);

		expect(next.phase).toBe('verifying');
		expect(next.status).toBe('active');
		expect(next.workflowId).toBe('wf_123');
		expect(action.type).toBe('verify');
		if (action.type === 'verify') {
			expect(action.workflowId).toBe('wf_123');
		}
		expect(attempt.action).toBe('build');
		expect(attempt.result).toBe('success');
	});

	it('transitions to done for trigger-only workflows', () => {
		const state = makeState();
		const outcome = makeOutcome({
			workflowId: 'wf_123',
			triggerType: 'trigger_only',
		});

		const { state: next, action } = handleBuildOutcome(state, [], outcome);

		expect(next.phase).toBe('done');
		expect(next.status).toBe('completed');
		expect(action.type).toBe('done');
	});

	it('transitions to blocked when not submitted', () => {
		const state = makeState();
		const outcome = makeOutcome({
			submitted: false,
			failureSignature: 'tsc error',
		});

		const { state: next, action, attempt } = handleBuildOutcome(state, [], outcome);

		expect(next.phase).toBe('blocked');
		expect(next.status).toBe('blocked');
		expect(action.type).toBe('blocked');
		expect(attempt.result).toBe('failure');
	});

	it('transitions to blocked when user input needed', () => {
		const state = makeState();
		const outcome = makeOutcome({
			submitted: true,
			workflowId: 'wf_123',
			needsUserInput: true,
			blockingReason: 'Missing Slack channel ID',
		});

		const { state: next, action } = handleBuildOutcome(state, [], outcome);

		expect(next.phase).toBe('blocked');
		expect(action.type).toBe('blocked');
	});

	it('records attempt with correct attempt number', () => {
		const state = makeState();
		const priorAttempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'building',
				attempt: 1,
				action: 'build',
				result: 'failure',
				createdAt: new Date().toISOString(),
			},
		];
		const outcome = makeOutcome({ workflowId: 'wf_123' });

		const { attempt } = handleBuildOutcome(state, priorAttempts, outcome);

		expect(attempt.attempt).toBe(2);
	});

	it('persists hasUnresolvedPlaceholders in state and done action', () => {
		const state = makeState();
		const outcome = makeOutcome({
			workflowId: 'wf_123',
			triggerType: 'trigger_only',
			hasUnresolvedPlaceholders: true,
		});

		const { state: next, action } = handleBuildOutcome(state, [], outcome);

		expect(next.hasUnresolvedPlaceholders).toBe(true);
		expect(action.type).toBe('done');
		if (action.type === 'done') {
			expect(action.hasUnresolvedPlaceholders).toBe(true);
		}
	});

	it('does not set hasUnresolvedPlaceholders when not present in outcome', () => {
		const state = makeState();
		const outcome = makeOutcome({
			workflowId: 'wf_123',
			triggerType: 'trigger_only',
		});

		const { state: next, action } = handleBuildOutcome(state, [], outcome);

		expect(next.hasUnresolvedPlaceholders).toBeUndefined();
		if (action.type === 'done') {
			expect(action.hasUnresolvedPlaceholders).toBeUndefined();
		}
	});
});

// ── handleVerificationVerdict ───────────────────────────────────────────────

describe('handleVerificationVerdict', () => {
	it('transitions to done on verified', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({ verdict: 'verified', executionId: 'exec_1' });

		const { state: next, action } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('done');
		expect(next.status).toBe('completed');
		expect(next.lastExecutionId).toBe('exec_1');
		expect(action.type).toBe('done');
	});

	it('transitions to done on trigger_only', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({ verdict: 'trigger_only' });

		const { state: next, action } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('done');
		expect(action.type).toBe('done');
	});

	it('passes through hasUnresolvedPlaceholders from state on verified', () => {
		const state = makeState({
			phase: 'verifying',
			workflowId: 'wf_123',
			hasUnresolvedPlaceholders: true,
		});
		const verdict = makeVerdict({ verdict: 'verified' });

		const { action } = handleVerificationVerdict(state, [], verdict);

		expect(action.type).toBe('done');
		if (action.type === 'done') {
			expect(action.hasUnresolvedPlaceholders).toBe(true);
		}
	});

	it('transitions to blocked on needs_user_input', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({
			verdict: 'needs_user_input',
			diagnosis: 'Missing API key',
		});

		const { state: next, action } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('blocked');
		expect(action.type).toBe('blocked');
	});

	it('transitions to blocked on failed_terminal', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({
			verdict: 'failed_terminal',
			failureSignature: 'node:timeout',
		});

		const { state: next } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('blocked');
		expect(next.lastFailureSignature).toBe('node:timeout');
	});

	it('produces a patch action for needs_patch verdict', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({
			verdict: 'needs_patch',
			failedNodeName: 'Gmail Send',
			diagnosis: 'Invalid recipient address',
			patch: { parameters: { to: 'fix@example.com' } },
			failureSignature: 'gmail:invalid_recipient',
		});

		const { state: next, action, attempt } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('repairing');
		expect(next.rebuildAttempts).toBe(1);
		expect(action.type).toBe('patch');
		if (action.type === 'patch') {
			expect(action.workflowId).toBe('wf_123');
			expect(action.failedNodeName).toBe('Gmail Send');
			expect(action.diagnosis).toBe('Invalid recipient address');
			expect(action.patch).toEqual({ parameters: { to: 'fix@example.com' } });
		}
		expect(attempt.action).toBe('patch');
	});

	it('produces patch action with fallback node name when failedNodeName is missing', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({
			verdict: 'needs_patch',
			failureSignature: 'gmail:error',
		});

		const { action } = handleVerificationVerdict(state, [], verdict);

		expect(action.type).toBe('patch');
		if (action.type === 'patch') {
			expect(action.failedNodeName).toBe('unknown');
		}
	});

	it('transitions to repairing with rebuild on needs_rebuild', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123' });
		const verdict = makeVerdict({
			verdict: 'needs_rebuild',
			diagnosis: 'Multiple nodes misconfigured',
			failureSignature: 'multi:config_error',
		});

		const { state: next, action } = handleVerificationVerdict(state, [], verdict);

		expect(next.phase).toBe('repairing');
		expect(next.rebuildAttempts).toBe(1);
		expect(action.type).toBe('rebuild');
	});
});

// ── Retry policy ────────────────────────────────────────────────────────────

describe('retry policy', () => {
	it('blocks on repeated needs_patch with same failureSignature', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123', rebuildAttempts: 1 });
		const priorAttempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'repairing',
				attempt: 1,
				action: 'patch',
				result: 'failure',
				failureSignature: 'gmail:auth_error',
				createdAt: new Date().toISOString(),
			},
		];
		const verdict = makeVerdict({
			verdict: 'needs_patch',
			failureSignature: 'gmail:auth_error',
			failedNodeName: 'Gmail Send',
			patch: { credentials: { gmailOAuth2: { id: '123', name: 'Gmail' } } },
		});

		const { state: next, action } = handleVerificationVerdict(state, priorAttempts, verdict);

		expect(next.phase).toBe('blocked');
		expect(action.type).toBe('blocked');
	});

	it('blocks on repeated rebuild with same failureSignature', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123', rebuildAttempts: 1 });
		const priorAttempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'repairing',
				attempt: 1,
				action: 'rebuild',
				result: 'failure',
				failureSignature: 'multi:timeout',
				createdAt: new Date().toISOString(),
			},
		];
		const verdict = makeVerdict({
			verdict: 'needs_rebuild',
			failureSignature: 'multi:timeout',
		});

		const { state: next, action } = handleVerificationVerdict(state, priorAttempts, verdict);

		expect(next.phase).toBe('blocked');
		expect(action.type).toBe('blocked');
	});

	it('allows patch for a different failureSignature', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123', rebuildAttempts: 1 });
		const priorAttempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'repairing',
				attempt: 1,
				action: 'patch',
				result: 'failure',
				failureSignature: 'gmail:auth_error',
				createdAt: new Date().toISOString(),
			},
		];
		const verdict = makeVerdict({
			verdict: 'needs_patch',
			failureSignature: 'gmail:rate_limit', // Different signature
			failedNodeName: 'Gmail Send',
			patch: { parameters: { retryOnFail: true } },
		});

		const { action } = handleVerificationVerdict(state, priorAttempts, verdict);

		expect(action.type).toBe('patch');
	});

	it('blocks when patch follows a rebuild with the same failureSignature', () => {
		const state = makeState({ phase: 'verifying', workflowId: 'wf_123', rebuildAttempts: 1 });
		const priorAttempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'repairing',
				attempt: 1,
				action: 'rebuild',
				result: 'failure',
				failureSignature: 'node:error',
				createdAt: new Date().toISOString(),
			},
		];
		const verdict = makeVerdict({
			verdict: 'needs_patch',
			failureSignature: 'node:error',
			failedNodeName: 'Code',
		});

		const { state: next, action } = handleVerificationVerdict(state, priorAttempts, verdict);

		expect(next.phase).toBe('blocked');
		expect(action.type).toBe('blocked');
	});

	it('parallel work items do not collide in attempt history', () => {
		const state1 = makeState({ workItemId: 'wi_1' });
		const state2 = makeState({ workItemId: 'wi_2' });

		const outcome1 = makeOutcome({ workItemId: 'wi_1', workflowId: 'wf_1' });
		const outcome2 = makeOutcome({ workItemId: 'wi_2', workflowId: 'wf_2' });

		const { attempt: a1 } = handleBuildOutcome(state1, [], outcome1);
		const { attempt: a2 } = handleBuildOutcome(state2, [a1], outcome2);

		// Each work item counts its own attempts independently
		expect(a1.attempt).toBe(1);
		expect(a2.attempt).toBe(1); // Not 2, because wi_2 has no prior attempts
	});
});

// ── formatAttemptHistory ────────────────────────────────────────────────────

describe('formatAttemptHistory', () => {
	it('returns empty string for no attempts', () => {
		expect(formatAttemptHistory([])).toBe('');
	});

	it('formats attempts as XML block', () => {
		const attempts: AttemptRecord[] = [
			{
				workItemId: 'wi_test',
				phase: 'building',
				attempt: 1,
				action: 'build',
				result: 'success',
				createdAt: '2024-01-01T00:00:00Z',
			},
			{
				workItemId: 'wi_test',
				phase: 'verifying',
				attempt: 2,
				action: 'verify',
				result: 'failure',
				failureSignature: 'node:error',
				diagnosis: 'Missing credential',
				createdAt: '2024-01-01T00:01:00Z',
			},
		];

		const output = formatAttemptHistory(attempts);
		expect(output).toContain('<previous-attempts>');
		expect(output).toContain('Attempt 1 [build]: success');
		expect(output).toContain('Attempt 2 [verify]: failure');
		expect(output).toContain('node:error');
		expect(output).toContain('Missing credential');
	});
});
