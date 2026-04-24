import {
	InstanceAiConfirmRequestDto,
	type InstanceAiConfirmRequest,
} from '../instance-ai-confirm-request.dto';

/**
 * The shapes in this file mirror what each frontend call site sends (see
 * components/ and composables/useSetupActions.ts in editor-ui). If a call site
 * changes the body shape, its branch here must change too — that is the whole
 * point of keeping this test.
 */

describe('InstanceAiConfirmRequestDto', () => {
	describe('accepts each frontend-sent payload shape', () => {
		const cases: Array<[label: string, payload: InstanceAiConfirmRequest]> = [
			// InstanceAiConfirmationPanel: handleConfirm / handleApproveAll / handlePlanApprove / handleTextSkip
			['approval approve (no input)', { kind: 'approval', approved: true }],
			['approval deny (no input)', { kind: 'approval', approved: false }],
			// InstanceAiConfirmationPanel: handleTextSubmit
			[
				'approval with userInput (text submit)',
				{ kind: 'approval', approved: true, userInput: 'some typed answer' },
			],
			// InstanceAiConfirmationPanel: handlePlanRequestChanges + AgentTimeline feedback
			[
				'approval deny with userInput (plan feedback)',
				{ kind: 'approval', approved: false, userInput: 'please revise step 3' },
			],
			// InstanceAiConfirmationPanel: handleQuestionsSubmit
			[
				'questions with mixed answers',
				{
					kind: 'questions',
					approved: true,
					answers: [
						{ questionId: 'q1', selectedOptions: ['opt-a'] },
						{ questionId: 'q2', selectedOptions: ['opt-b', 'opt-c'], customText: 'extra' },
						{ questionId: 'q3', selectedOptions: [], skipped: true },
					],
				},
			],
			// InstanceAiCredentialSetup: handleContinue
			[
				'credentialSelection with credential map',
				{
					kind: 'credentialSelection',
					approved: true,
					credentials: { slackApi: 'cred-1', githubApi: 'cred-2' },
				},
			],
			// DomainAccessApproval: handleAction (primary path — with action)
			[
				'domainAccess approve with allow_domain',
				{ kind: 'domainAccess', approved: true, domainAccessAction: 'allow_domain' },
			],
			[
				'domainAccess approve with allow_once',
				{
					kind: 'domainAccess',
					approved: true,
					domainAccessAction: 'allow_once',
				},
			],
			[
				'domainAccess approve with allow_all',
				{
					kind: 'domainAccess',
					approved: true,
					domainAccessAction: 'allow_all',
				},
			],
			// DomainAccessApproval: handleAction (deny path — no action passed)
			['domainAccess deny', { kind: 'domainAccess', approved: false }],
			// confirmResourceDecision (store)
			[
				'resourceDecision with arbitrary decision token',
				{ kind: 'resourceDecision', approved: true, resourceDecision: 'allowForSession' },
			],
			// useSetupActions: handleApply
			[
				'setupWorkflowApply (full payload)',
				{
					kind: 'setupWorkflowApply',
					approved: true,
					action: 'apply',
					nodeCredentials: {
						'Slack Node': { slackApi: 'cred-1' },
						'GitHub Node': { githubApi: 'cred-2' },
					},
					nodeParameters: {
						'Slack Node': { channel: '#general' },
					},
				},
			],
			[
				'setupWorkflowApply (no node credentials)',
				{ kind: 'setupWorkflowApply', approved: true, action: 'apply' },
			],
			// useSetupActions: handleTestTrigger
			[
				'setupWorkflowTestTrigger (with node credentials)',
				{
					kind: 'setupWorkflowTestTrigger',
					approved: true,
					action: 'test-trigger',
					testTriggerNode: 'Webhook',
					nodeCredentials: { Webhook: { httpHeaderAuth: 'cred-3' } },
					nodeParameters: { Webhook: { path: '/trigger' } },
				},
			],
			[
				'setupWorkflowTestTrigger (minimal)',
				{
					kind: 'setupWorkflowTestTrigger',
					approved: true,
					action: 'test-trigger',
					testTriggerNode: 'Webhook',
				},
			],
		];

		test.each(cases)('%s', (_label, payload) => {
			const result = InstanceAiConfirmRequestDto.safeParse(payload);
			expect(result.success).toBe(true);
			if (result.success) expect(result.data).toEqual(payload);
		});
	});

	describe('rejects invalid payloads', () => {
		test('missing kind discriminator', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ approved: true });
			expect(result.success).toBe(false);
		});

		test('unknown kind', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'bogus', approved: true });
			expect(result.success).toBe(false);
		});

		test('questions without answers array', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'questions',
				approved: true,
			});
			expect(result.success).toBe(false);
		});

		test('credentialSelection without credentials map', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'credentialSelection',
				approved: true,
			});
			expect(result.success).toBe(false);
		});

		test('resourceDecision without decision', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'resourceDecision',
				approved: true,
			});
			expect(result.success).toBe(false);
		});

		test('setupWorkflowTestTrigger without testTriggerNode', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'setupWorkflowTestTrigger',
				approved: true,
				action: 'test-trigger',
			});
			expect(result.success).toBe(false);
		});

		test('action mismatch between kind and action field', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'setupWorkflowApply',
				approved: true,
				action: 'test-trigger',
			});
			expect(result.success).toBe(false);
		});

		test('approval=false is rejected for kinds that require approval=true', () => {
			for (const kind of [
				'questions',
				'credentialSelection',
				'resourceDecision',
				'setupWorkflowApply',
				'setupWorkflowTestTrigger',
			] as const) {
				const result = InstanceAiConfirmRequestDto.safeParse({ kind, approved: false });
				expect(result.success).toBe(false);
			}
		});

		test('domainAccessAction must be a known value', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'domainAccess',
				approved: true,
				domainAccessAction: 'allow_never',
			});
			expect(result.success).toBe(false);
		});
	});
});
