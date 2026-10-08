import {
	InstanceAiConfirmRequestDto,
	type InstanceAiConfirmRequest,
} from '../dto/instance-ai/instance-ai-confirm-request.dto';
import { canTeammateAnswer, sharedThreadApprovalScopes } from '../instance-ai-sharing';

describe('sharedThreadApprovalScopes', () => {
	it('asks for workflow update and publish to answer an automation proposal', () => {
		expect(sharedThreadApprovalScopes('propose_automation')).toEqual([
			'workflow:update',
			'workflow:publish',
		]);
	});

	it.each(['deploy_workflow', 'ask_user', 'setup-workflow', ''])(
		'asks for workflow update to answer the card of "%s"',
		(toolName) => {
			expect(sharedThreadApprovalScopes(toolName)).toEqual(['workflow:update']);
		},
	);

	it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty'])(
		'uses the default for the object property name "%s"',
		(toolName) => {
			expect(sharedThreadApprovalScopes(toolName)).toEqual(['workflow:update']);
		},
	);

	it('returns a new list, so a caller cannot change the policy', () => {
		sharedThreadApprovalScopes('propose_automation').push('workflow:delete');
		sharedThreadApprovalScopes('other_tool').push('workflow:delete');

		expect(sharedThreadApprovalScopes('propose_automation')).toEqual([
			'workflow:update',
			'workflow:publish',
		]);
		expect(sharedThreadApprovalScopes('other_tool')).toEqual(['workflow:update']);
	});

	it.each(['propose_automation', 'deploy_workflow', 'PROPOSE_AUTOMATION', ' propose_automation'])(
		'always asks for workflow update, also for "%s"',
		(toolName) => {
			expect(sharedThreadApprovalScopes(toolName)).toContain('workflow:update');
		},
	);
});

describe('canTeammateAnswer', () => {
	it.each<InstanceAiConfirmRequest>([
		{ kind: 'approval', approved: true },
		{ kind: 'approval', approved: false },
		{ kind: 'approval', approved: true, scope: 'session' },
		{ kind: 'approval', approved: true, userInput: '' },
		{ kind: 'approval', approved: true, userInput: '  \n ' },
		{ kind: 'capabilityDecision', approved: true, values: { activate: true } },
		{ kind: 'capabilityDecision', approved: false },
		{ kind: 'domainAccessApprove', domainAccessAction: 'allow_domain' },
		{ kind: 'domainAccessDeny' },
		{ kind: 'planDeny' },
	])('lets a teammate decide on a card: %j', (answer) => {
		expect(canTeammateAnswer(answer)).toBe(true);
	});

	it.each<InstanceAiConfirmRequest>([
		{ kind: 'approval', approved: true, userInput: 'Use the sales sheet' },
		{ kind: 'approval', approved: false, userInput: 'Change step 2' },
		{ kind: 'questions', answers: [{ questionId: 'q1', selectedOptions: ['a'] }] },
		{ kind: 'credentialSelection', credentials: { slackApi: 'credential-1' } },
		{ kind: 'credentialAutoSetup', credentialType: 'slackApi' },
		{ kind: 'credentialDestination', approved: true, origin: 'local' },
		{ kind: 'resourceDecision', resourceDecision: 'allowOnce' },
		{ kind: 'setupWorkflowApply', nodeCredentials: { Slack: { slackApi: 'credential-1' } } },
		{ kind: 'setupWorkflowTestTrigger', testTriggerNode: 'Webhook' },
		{ kind: 'mcpConnect', approved: true, connectedSlugs: ['notion'] },
	])('keeps the answer for the owner: %j', (answer) => {
		expect(canTeammateAnswer(answer)).toBe(false);
	});

	it('knows every answer kind, so that a new kind is a decision to make here', () => {
		const kinds = InstanceAiConfirmRequestDto.options.map((option) => option.shape.kind.value);

		expect(kinds.filter((kind) => canTeammateAnswer({ kind } as InstanceAiConfirmRequest))).toEqual(
			['approval', 'domainAccessApprove', 'domainAccessDeny', 'planDeny', 'capabilityDecision'],
		);
	});
});
