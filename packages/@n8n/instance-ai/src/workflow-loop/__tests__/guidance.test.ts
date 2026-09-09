import { formatWorkflowLoopGuidance } from '../guidance';
import type { VerificationClaim, WorkflowLoopAction } from '../workflow-loop-state';

function makeClaim(overrides: Partial<VerificationClaim> = {}): VerificationClaim {
	return {
		level: 'verified',
		plannedNodeCount: 3,
		reachedNodeCount: 3,
		nodesNotReached: [],
		simulatedNodes: [],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: true,
		liveTestRecommended: false,
		...overrides,
	};
}

describe('formatWorkflowLoopGuidance', () => {
	// ── done ────────────────────────────────────────────────────────────────────

	describe('action type "done"', () => {
		it('should not claim verification when no run recorded a claim', () => {
			// A `verified` verdict reported without verifying leaves no claim. This
			// sentence used to say "Workflow verified successfully", which handed
			// the model the exact wording with no run evidence behind it.
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('Workflow verified successfully');
			expect(result).toContain('No automatic verification evidence is recorded');
			expect(result).toContain('do NOT call the workflow verified');
			expect(result).not.toContain('Workflow ID:');
		});

		it('should not claim success when the claim is partial', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
				claim: makeClaim({
					level: 'partial',
					reachedNodeCount: 5,
					plannedNodeCount: 12,
					nodesNotReached: ['Send Email', 'Log Row'],
					publishReady: false,
					liveTestRecommended: true,
				}),
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('Workflow verified successfully');
			expect(result).toContain('NOT fully verified');
			expect(result).toContain('2 of 12 node(s) were never reached');
			expect(result).toContain('Send Email, Log Row');
			expect(result).toContain('Do NOT offer to publish it.');
			expect(result).toContain('Offer a live end-to-end test');
		});

		it('should name the unproven fix target when the claim is unproven', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Patched',
				claim: makeClaim({
					level: 'unproven',
					plannedNodeCount: 4,
					reachedNodeCount: 4,
					unprovenTargets: ['Send Email'],
					simulatedNodes: [{ nodeName: 'Send Email', reason: 'Sends a message' }],
					publishReady: false,
					liveTestRecommended: true,
				}),
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('Workflow verified successfully');
			expect(result).toContain('Changed but NOT verified');
			expect(result).toContain('never proven: Send Email');
			expect(result).toContain('nothing real happened at: Send Email');
		});

		it('should keep the verified wording when the claim is verified', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
				claim: makeClaim(),
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('Workflow verified successfully');
			expect(result).toContain('Report completion');
		});

		it('should downgrade the mocked-credential guidance too', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'All good',
				workflowId: 'wf-123',
				mockedCredentialTypes: ['slackApi'],
				claim: makeClaim({
					level: 'partial',
					nodesNotReached: ['Send Email'],
					publishReady: false,
					liveTestRecommended: true,
				}),
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('Workflow verified successfully');
			expect(result).toContain('NOT fully verified');
			expect(result).toContain('workflows(action="setup")');
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
			expect(result).not.toContain('credentials(action="setup")');
			expect(result).not.toContain('mock');
		});

		it('should not mention credentials when mockedCredentialTypes is empty', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built successfully',
				mockedCredentialTypes: [],
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('credentials(action="setup")');
			expect(result).toContain('Report the outcome');
		});

		it('should include credential instructions when mockedCredentialTypes has entries', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with mocks',
				mockedCredentialTypes: ['slackOAuth2Api', 'gmailOAuth2'],
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflows(action="setup")');
			expect(result).toContain('inline setup card in the AI Assistant panel');
			expect(result).toContain('Do not call');
			expect(result).not.toContain('setup UI');
		});

		it('should include workflowId in workflow setup guidance when mockedCredentialTypes present', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Done with mocks',
				mockedCredentialTypes: ['notionApi'],
				workflowId: 'wf-42',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflows(action="setup")');
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

		it('should trigger workflow setup guidance when hasUnresolvedPlaceholders is true (no mocked credentials)', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with placeholders',
				workflowId: 'wf-ph-1',
				hasUnresolvedPlaceholders: true,
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflows(action="setup")');
			expect(result).toContain('wf-ph-1');
		});

		it('should forbid invented canvas or editor setup instructions', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with placeholders',
				workflowId: 'wf-ph-1',
				hasUnresolvedPlaceholders: true,
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain(
				'Do not tell the user to open the editor, use the canvas, or click a Setup button',
			);
		});

		it('should not send the user back to the setup card for credentials they skipped', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with mocks the user skipped',
				mockedCredentialTypes: ['slackApi'],
				hasUnresolvedPlaceholders: true,
				workflowId: 'wf-skip-1',
				setupSkippedByUser: true,
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).not.toContain('workflows(action="setup")');
			expect(result).toContain('skipped earlier in this conversation');
			expect(result).toContain('offer');
		});

		it('should trigger workflow setup guidance when both mocked credentials and placeholders exist', () => {
			const action: WorkflowLoopAction = {
				type: 'done',
				summary: 'Built with mocks and placeholders',
				mockedCredentialTypes: ['gmailOAuth2'],
				hasUnresolvedPlaceholders: true,
				workflowId: 'wf-ph-2',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflows(action="setup")');
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

		it('should default report-verification-verdict workItemId to "unknown"', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-456',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('"unknown"');
		});

		it('should mention repeatable verify-built-workflow and fixture overrides', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-789',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflows(action="get-as-code", workflowId)');
			expect(result).toContain('Build/save success only means a workflow was saved');
			expect(result).toContain('verify-built-workflow');
			expect(result).toContain('safe to call multiple times');
			expect(result).toContain('fixtureOverrides');
		});

		it('should mention execution debug action and report-verification-verdict', () => {
			const action: WorkflowLoopAction = {
				type: 'verify',
				workflowId: 'wf-789',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('executions(action="debug")');
			expect(result).toContain('needs_patch');
			expect(result).toContain('needs_rebuild');
			expect(result).toContain('report-verification-verdict');
			expect(result).toContain('workflowInspection');
		});
	});

	// ── continue_building ─────────────────────────────────────────────────────

	describe('action type "continue_building"', () => {
		it('should instruct the builder to fix code and build again', () => {
			const action: WorkflowLoopAction = {
				type: 'continue_building',
				reason: 'Validation failed',
				sourceFilePath: 'src/workflows/main.workflow.ts',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('BUILD FAILED');
			expect(result).toContain('build-workflow');
			expect(result).toContain('src/workflows/main.workflow.ts');
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

		it('should instruct to load workflow-builder, edit the source file, and rebuild with filePath', () => {
			const action: WorkflowLoopAction = {
				type: 'rebuild',
				workflowId: 'wf-rebuild-2',
				sourceFilePath: 'src/workflows/main.workflow.ts',
				failureDetails: 'Broken connections',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflow-builder');
			expect(result).toContain('build-workflow');
			expect(result).toContain('filePath "src/workflows/main.workflow.ts"');
			expect(result).toContain('workflowId "wf-rebuild-2"');
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

		it('should instruct to load workflow-builder, edit the source file, and build with filePath', () => {
			const action: WorkflowLoopAction = {
				type: 'patch',
				workflowId: 'wf-patch-4',
				sourceFilePath: 'src/workflows/main.workflow.ts',
				failedNodeName: 'IF',
				diagnosis: 'Condition always evaluates to true',
			};
			const result = formatWorkflowLoopGuidance(action);
			expect(result).toContain('workflow-builder');
			expect(result).toContain('build-workflow');
			expect(result).toContain('filePath "src/workflows/main.workflow.ts"');
			expect(result).toContain('workflowId "wf-patch-4"');
			expect(result).toContain('targeted fix');
		});
	});

	// ── options.workItemId passthrough ──────────────────────────────────────────

	describe('options.workItemId', () => {
		it('should pass workItemId to verify guidance', () => {
			const action: WorkflowLoopAction = { type: 'verify', workflowId: 'wf-1' };
			const result = formatWorkflowLoopGuidance(action, { workItemId: 'wi-abc' });
			// workItemId appears in verify-built-workflow guidance and report-verification-verdict.
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

		it('should not affect blocked actions and should bind repair actions', () => {
			const blocked = formatWorkflowLoopGuidance(
				{ type: 'blocked', reason: 'No access' },
				{ workItemId: 'wi-ignored' },
			);
			expect(blocked).not.toContain('wi-ignored');

			const rebuild = formatWorkflowLoopGuidance(
				{ type: 'rebuild', workflowId: 'wf-1', failureDetails: 'broken' },
				{ workItemId: 'wi-ignored' },
			);
			expect(rebuild).toContain('wi-ignored');
		});
	});
});

describe('formatWorkflowLoopGuidance — setup panel', () => {
	const action: WorkflowLoopAction = {
		type: 'done',
		summary: 'Built',
		workflowId: 'wf-123',
		mockedCredentialTypes: ['slackApi'],
	};

	it('still routes through workflows setup, but as an announcement that ends the turn', () => {
		const result = formatWorkflowLoopGuidance(action, { setupPanelEnabled: true });

		expect(result).toContain('workflows(action="setup")');
		expect(result).toContain('wf-123');
		expect(result).toContain('setup panel next to the chat');
		expect(result).toContain('end your turn');
		expect(result).toContain('When the result has `announced: true`');
		expect(result).toContain('Otherwise follow the returned guidance');
		expect(result).not.toContain('No card opens');
		expect(result).not.toContain('inline setup card');
	});

	it('keeps the card wording while the panel is off', () => {
		expect(formatWorkflowLoopGuidance(action, {})).toContain('inline setup card');
	});
});
