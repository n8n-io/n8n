import {
	applyBranchReadOnlyOverrides,
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	isDisplayableConfirmationRequest,
	type InstanceAiConfirmationInputType,
	type InstanceAiConfirmationRequestPayload,
	type InstanceAiPermissions,
} from '../instance-ai.schema';

describe('applyBranchReadOnlyOverrides', () => {
	it('should block all write permissions while preserving safe ones', () => {
		const result = applyBranchReadOnlyOverrides({ ...DEFAULT_INSTANCE_AI_PERMISSIONS });

		// These should remain unchanged (safe for read-only instances)
		expect(result.readFilesystem).toBe('require_approval');
		expect(result.fetchUrl).toBe('require_approval');
		expect(result.publishWorkflow).toBe('require_approval');
		expect(result.deleteCredential).toBe('require_approval');
		expect(result.restoreWorkflowVersion).toBe('require_approval');

		// These should all be blocked
		expect(result.createWorkflow).toBe('blocked');
		expect(result.updateWorkflow).toBe('blocked');
		expect(result.runWorkflow).toBe('blocked');
		expect(result.deleteWorkflow).toBe('blocked');
		expect(result.createFolder).toBe('blocked');
		expect(result.deleteFolder).toBe('blocked');
		expect(result.moveWorkflowToFolder).toBe('blocked');
		expect(result.tagWorkflow).toBe('blocked');
		expect(result.createDataTable).toBe('blocked');
		expect(result.deleteDataTable).toBe('blocked');
		expect(result.mutateDataTableSchema).toBe('blocked');
		expect(result.mutateDataTableRows).toBe('blocked');
		expect(result.cleanupTestExecutions).toBe('blocked');
	});

	it('should preserve safe permissions even when set to always_allow', () => {
		const permissions: InstanceAiPermissions = {
			...DEFAULT_INSTANCE_AI_PERMISSIONS,
			publishWorkflow: 'always_allow',
			deleteCredential: 'always_allow',
			readFilesystem: 'always_allow',
		};

		const result = applyBranchReadOnlyOverrides(permissions);

		expect(result.publishWorkflow).toBe('always_allow');
		expect(result.deleteCredential).toBe('always_allow');
		expect(result.readFilesystem).toBe('always_allow');
	});

	it('should not mutate the original permissions object', () => {
		const original = { ...DEFAULT_INSTANCE_AI_PERMISSIONS };
		applyBranchReadOnlyOverrides(original);

		expect(original.createWorkflow).toBe('require_approval');
	});
});

function makeConfirmation(
	overrides: Partial<InstanceAiConfirmationRequestPayload> = {},
): InstanceAiConfirmationRequestPayload {
	return {
		requestId: 'req-1',
		toolCallId: 'tc-1',
		toolName: 'tool',
		args: {},
		severity: 'info',
		message: 'Please approve',
		...overrides,
	};
}

describe('isDisplayableConfirmationRequest', () => {
	it('treats approval and text messages as displayable', () => {
		expect(isDisplayableConfirmationRequest(makeConfirmation({ inputType: 'approval' }))).toBe(
			true,
		);
		expect(isDisplayableConfirmationRequest(makeConfirmation({ inputType: 'text' }))).toBe(true);
	});

	it('does not treat metadata-only approval prompts as displayable', () => {
		expect(isDisplayableConfirmationRequest(makeConfirmation({ message: '   ' }))).toBe(false);
	});

	it('does not treat intro-only questions prompts as displayable', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'questions',
					message: '',
					introMessage: 'A little context before the questions',
				}),
			),
		).toBe(false);
	});

	it('recognizes typed display variants', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'questions',
					message: '',
					questions: [{ id: 'q1', question: 'Pick one', type: 'single', options: ['A'] }],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					planItems: [{ id: 'task-1', title: 'Task', kind: 'delegate', spec: 'Do it', deps: [] }],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'resource-decision',
					message: '',
					resourceDecision: {
						toolGroup: 'filesystem',
						resource: '/tmp',
						description: 'Access /tmp',
						options: ['allowForSession'],
					},
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					setupRequests: [
						{
							node: {
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 1,
								parameters: {},
								position: [0, 0],
								id: 'node-1',
							},
							isTrigger: true,
						},
					],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					credentialRequests: [
						{ credentialType: 'httpBasicAuth', reason: 'Required', existingCredentials: [] },
					],
				}),
			),
		).toBe(true);
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					domainAccess: { url: 'https://example.com', host: 'example.com' },
				}),
			),
		).toBe(true);
	});

	it('does not treat credential flow metadata as displayable on its own', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					message: '',
					credentialFlow: { stage: 'finalize' },
				}),
			),
		).toBe(false);
	});

	it('does not treat lightweight task lists as displayable plan reviews', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					tasks: {
						tasks: [{ id: 'task-1', description: 'Do it', status: 'todo' }],
					},
				}),
			),
		).toBe(false);
	});

	it('recognizes only renderable task args for plan reviews', () => {
		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					args: {
						tasks: [{ id: 'task-1', title: 'Task', kind: 'delegate', spec: 'Do it', deps: [] }],
					},
				}),
			),
		).toBe(true);

		expect(
			isDisplayableConfirmationRequest(
				makeConfirmation({
					inputType: 'plan-review',
					message: 'Ignored for displayability',
					args: {
						tasks: [{ id: 'task-1', description: 'Do it', status: 'todo' }],
					},
				}),
			),
		).toBe(false);
	});

	it('keeps the input type switch exhaustive', () => {
		const handled = {
			approval: true,
			text: true,
			questions: true,
			'plan-review': true,
			'resource-decision': true,
			continue: true,
		} satisfies Record<InstanceAiConfirmationInputType, true>;

		expect(Object.keys(handled)).toHaveLength(6);
	});
});
