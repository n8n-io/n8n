import { sharedThreadApprovalScopes } from '../instance-ai-sharing';

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
