import { formatWorkflowLoopGuidance } from '../guidance';
import type { WorkflowLoopAction } from '../workflow-loop-state';

describe('formatWorkflowLoopGuidance', () => {
	// ── done ────────────────────────────────────────────────────────────────────

	describe('action type "done"', () => {
		it('should report completion without workflowId', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('Workflow verified successfully');
			expect(result).toContain('Report completion');
			expect(result).not.toContain('Workflow ID:');
		});

		it('should include workflowId when present', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
				workflowId: 'wf-123',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('Workflow ID: wf-123');
		});

		it('should not mention credentials when mockedCredentialTypes is undefined', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built successfully',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('setup-credentials');
			expect(result).not.toContain('mock');
		});

		it('should not mention credentials when mockedCredentialTypes is empty', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built successfully',
				mockedCredentialTypes: [],
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('setup-credentials');
			expect(result).toContain('Report completion');
		});

		it('should include credential instructions when mockedCredentialTypes has entries', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with mocks',
				mockedCredentialTypes: ['slackOAuth2Api', 'gmailOAuth2'],
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('setup-workflow');
			expect(result).toContain('Do not call');
		});

		it('should include workflowId in setup-workflow guidance when mockedCredentialTypes present', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Done with mocks',
				mockedCredentialTypes: ['notionApi'],
				workflowId: 'wf-42',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('setup-workflow');
			expect(result).toContain('wf-42');
		});

		it('should default workflowId to "unknown" when not provided and mocked credentials exist', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Done with mocks',
				mockedCredentialTypes: ['notionApi'],
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('"unknown"');
		});

		it('should trigger setup-workflow guidance when hasUnresolvedPlaceholders is true (no mocked credentials)', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with placeholders',
				workflowId: 'wf-ph-1',
				hasUnresolvedPlaceholders: true,
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('setup-workflow');
			expect(result).toContain('wf-ph-1');
		});

		it('should trigger setup-workflow guidance when both mocked credentials and placeholders exist', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with mocks and placeholders',
				mockedCredentialTypes: ['gmailOAuth2'],
				hasUnresolvedPlaceholders: true,
				workflowId: 'wf-ph-2',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('setup-workflow');
		});
	});

	// ── verify ─────────────────────────────────────────────────────────────────

	describe('action type "verify"', () => {
		it('should include workflowId in the output', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-456',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('wf-456');
			expect(result).toContain('VERIFY');
		});

		it('should include workItemId from options', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-456',
			};
			const result = formatWorkflowLoopGuidance(action, { workItemId: 'wi-99' });
			expect(result).toContain('wi-99');
		});

		it('should default workItemId to "unknown"', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-456',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('"unknown"');
		});

		it('should mention verify-built-workflow and run-workflow', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-789',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('verify-built-workflow');
			expect(result).toContain('run-workflow');
		});

		it('should mention debug-execution and report-verification-verdict', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-789',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('debug-execution');
			expect(result).toContain('report-verification-verdict');
		});
	});

	// ── blocked ────────────────────────────────────────────────────────────────

	describe('action type "blocked"', () => {
		it('should include the reason', () => {
			const action: WorkflowLoopAction = {
				type: 'blocked',
				reason: 'Missing API key for Slack',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('BUILD BLOCKED');
			expect(result).toContain('Missing API key for Slack');
		});

		it('should instruct to explain to the user', () => {
			const action: WorkflowLoopAction = {
				type: 'blocked',
				reason: 'Unsupported trigger',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('Explain this to the user');
		});
	});

	// ── rebuild ────────────────────────────────────────────────────────────────

	describe('action type "rebuild"', () => {
		it('should include workflowId and failureDetails', () => {
			const action: WorkflowLoopAction = {
				type: 'rebuild',
				workflowId: 'wf-rebuild-1',
				failureDetails: 'Node configuration is invalid after schema change',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('REBUILD NEEDED');
			expect(result).toContain('wf-rebuild-1');
			expect(result).toContain('Node configuration is invalid after schema change');
		});

		it('should instruct to submit a new plan with build-workflow task', () => {
			const action: WorkflowLoopAction = {
				type: 'rebuild',
				workflowId: 'wf-rebuild-2',
				failureDetails: 'Broken connections',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('build-workflow');
			expect(result).toContain('plan');
			expect(result).toContain('structural repair');
		});
	});

	// ── patch ──────────────────────────────────────────────────────────────────

	describe('action type "patch"', () => {
		it('should include failedNodeName and diagnosis', () => {
			const action: WorkflowLoopAction = {
				type: 'patch',
				workflowId: 'wf-patch-1',
				failedNodeName: 'HTTP Request',
				diagnosis: 'URL parameter is missing the protocol prefix',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('PATCH NEEDED');
			expect(result).toContain('"HTTP Request"');
			expect(result).toContain('URL parameter is missing the protocol prefix');
		});

		it('should include suggested patch when provided', () => {
			const action: WorkflowLoopAction = {
				type: 'patch',
				workflowId: 'wf-patch-2',
				failedNodeName: 'Set',
				diagnosis: 'Wrong field name',
				patch: { field: 'email', value: 'user@example.com' },
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('Suggested fix');
			expect(result).toContain('email');
			expect(result).toContain('user@example.com');
		});

		it('should not include "Suggested fix" when patch is not provided', () => {
			const action: WorkflowLoopAction = {
				type: 'patch',
				workflowId: 'wf-patch-3',
				failedNodeName: 'Code',
				diagnosis: 'Syntax error in expression',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('Suggested fix');
		});

		it('should instruct to submit a plan with patch mode', () => {
			const action: WorkflowLoopAction = {
				type: 'patch',
				workflowId: 'wf-patch-4',
				failedNodeName: 'IF',
				diagnosis: 'Condition always evaluates to true',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('build-workflow');
			expect(result).toContain('mode "patch"');
			expect(result).toContain('wf-patch-4');
		});
	});

	// ── options.workItemId passthrough ──────────────────────────────────────────

	describe('options.workItemId', () => {
		it('should pass workItemId to verify guidance', () => {
			const action: WorkflowLoopAction = { type: 'verify', workflowId: 'wf-1' };
			const result = formatWorkflowLoopGuidance(action, { workItemId: 'wi-abc' });
			// workItemId appears in two places: verify-built-workflow and report-verification-verdict
			const occurrences = result.split('wi-abc').length - 1;
			expect(occurrences).toBeGreaterThanOrEqual(2);
		});

		it('should include workflowId in done guidance with mocked credentials', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'ok',
				mockedCredentialTypes: ['testApi'],
				workflowId: 'wf-xyz',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('wf-xyz');
		});

		it('should not affect blocked or rebuild actions', () => {
			const blocked = formatWorkflowLoopGuidance(
				{ type: 'blocked', reason: 'No access' },
				{ workItemId: 'wi-ignored' },
			);
			expect(blocked).not.toContain('wi-ignored');

			const rebuild = formatWorkflowLoopGuidance(
				{ type: 'rebuild', workflowId: 'wf-1', failureDetails: 'broken' },
				{ workItemId: 'wi-ignored' },
			);
			expect(rebuild).not.toContain('wi-ignored');
		});
	});
});
