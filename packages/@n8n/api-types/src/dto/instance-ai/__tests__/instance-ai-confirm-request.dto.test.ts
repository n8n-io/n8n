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
					credentials: { slackApi: 'cred-1', githubApi: 'cred-2' },
				},
			],
			// DomainAccessApproval: handleAction (primary path — with action)
			[
				'domainAccessApprove with allow_domain',
				{ kind: 'domainAccessApprove', domainAccessAction: 'allow_domain' },
			],
			[
				'domainAccessApprove with allow_once',
				{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' },
			],
			[
				'domainAccessApprove with allow_all',
				{ kind: 'domainAccessApprove', domainAccessAction: 'allow_all' },
			],
			// DomainAccessApproval: handleAction (deny path)
			['domainAccessDeny', { kind: 'domainAccessDeny' }],
			// confirmResourceDecision (store)
			[
				'resourceDecision with allowed decision token',
				{ kind: 'resourceDecision', resourceDecision: 'allowForSession' },
			],
			// useSetupActions: handleApply
			[
				'setupWorkflowApply (full payload)',
				{
					kind: 'setupWorkflowApply',
					nodeCredentials: {
						'Slack Node': { slackApi: 'cred-1' },
						'GitHub Node': { githubApi: 'cred-2' },
					},
					nodeParameters: {
						'Slack Node': { channel: '#general' },
					},
				},
			],
			['setupWorkflowApply (no node credentials)', { kind: 'setupWorkflowApply' }],
			// useSetupActions: handleTestTrigger
			[
				'setupWorkflowTestTrigger (with node credentials)',
				{
					kind: 'setupWorkflowTestTrigger',
					testTriggerNode: 'Webhook',
					nodeCredentials: { Webhook: { httpHeaderAuth: 'cred-3' } },
					nodeParameters: { Webhook: { path: '/trigger' } },
				},
			],
			[
				'setupWorkflowTestTrigger (minimal)',
				{ kind: 'setupWorkflowTestTrigger', testTriggerNode: 'Webhook' },
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
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'questions' });
			expect(result.success).toBe(false);
		});

		test('credentialSelection without credentials map', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'credentialSelection' });
			expect(result.success).toBe(false);
		});

		test('resourceDecision without decision', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'resourceDecision' });
			expect(result.success).toBe(false);
		});

		test('resourceDecision rejects persistent daemon-only decisions', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'resourceDecision',
				resourceDecision: 'alwaysAllow',
			});
			expect(result.success).toBe(false);
		});

		test('setupWorkflowTestTrigger without testTriggerNode', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'setupWorkflowTestTrigger' });
			expect(result.success).toBe(false);
		});

		test('domainAccessAction must be a known value', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({
				kind: 'domainAccessApprove',
				domainAccessAction: 'allow_never',
			});
			expect(result.success).toBe(false);
		});

		test('domainAccessApprove without domainAccessAction', () => {
			const result = InstanceAiConfirmRequestDto.safeParse({ kind: 'domainAccessApprove' });
			expect(result.success).toBe(false);
		});
	});
});
