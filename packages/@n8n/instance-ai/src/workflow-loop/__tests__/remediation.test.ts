import {
	MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
	createRemediation,
	remainingPostSubmitRemediations,
	terminalRemediationFromState,
} from '../remediation';
import type { WorkflowLoopState } from '../workflow-loop-state';

const baseState: WorkflowLoopState = {
	workItemId: 'wi_1',
	threadId: 'thread_1',
	runId: 'run_1',
	workflowId: 'wf_1',
	phase: 'verifying',
	status: 'active',
	source: 'create',
	rebuildAttempts: 0,
};

describe('remediation helpers', () => {
	it('returns the persisted terminal remediation before deriving one from budget state', () => {
		const persisted = createRemediation({
			category: 'needs_setup',
			shouldEdit: false,
			reason: 'mocked_credentials_or_placeholders',
			guidance: 'Stop editing and route to setup.',
		});

		const remediation = terminalRemediationFromState({
			...baseState,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
			lastRemediation: persisted,
		});

		expect(remediation).toBe(persisted);
	});

	it('derives a terminal remediation when the post-submit repair budget is exhausted', () => {
		const remediation = terminalRemediationFromState({
			...baseState,
			successfulSubmitSeen: true,
			postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
		});

		expect(remediation).toMatchObject({
			category: 'blocked',
			shouldEdit: false,
			reason: 'post_submit_budget_exhausted',
			attemptCount: MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
			remainingSubmitFixes: 0,
		});
	});

	it('does not derive terminal remediation before a successful submit or while budget remains', () => {
		expect(
			terminalRemediationFromState({
				...baseState,
				postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
			}),
		).toBeUndefined();

		expect(
			terminalRemediationFromState({
				...baseState,
				successfulSubmitSeen: true,
				postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS - 1,
			}),
		).toBeUndefined();
	});

	it('ignores terminal remediation from a previous run', () => {
		const remediation = terminalRemediationFromState(
			{
				...baseState,
				runId: 'run_previous',
				successfulSubmitSeen: true,
				postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS,
				lastRemediation: createRemediation({
					category: 'needs_setup',
					shouldEdit: false,
					reason: 'mocked_credentials_or_placeholders',
					guidance: 'Route to setup.',
				}),
			},
			'run_current',
		);

		expect(remediation).toBeUndefined();
	});

	it('reports remaining post-submit repairs without going below zero', () => {
		expect(
			remainingPostSubmitRemediations({
				...baseState,
				postSubmitRemediationSubmitsUsed: 1,
			}),
		).toBe(1);

		expect(
			remainingPostSubmitRemediations({
				...baseState,
				postSubmitRemediationSubmitsUsed: MAX_POST_SUBMIT_REMEDIATION_SUBMITS + 1,
			}),
		).toBe(0);
	});
});
