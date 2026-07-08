import { parseSuspendedToolCallConfirmation } from '../confirmation-request';

describe('parseSuspendedToolCallConfirmation', () => {
	it('parses one payload for live stream events and reload confirmations', () => {
		const parsed = parseSuspendedToolCallConfirmation({
			toolCallId: 'tool-call-1',
			toolName: 'workflows',
			input: { action: 'setup' },
			suspendPayload: {
				requestId: 'request-1',
				inputThreadId: 'input-thread-1',
				message: 'Configure workflow',
				severity: 'warning',
				inputType: 'continue',
				setupRequests: [
					{
						node: {
							id: 'node-1',
							name: 'Gmail',
							type: 'n8n-nodes-base.gmail',
							typeVersion: 2.2,
							parameters: {},
							position: [0, 0],
						},
						isTrigger: false,
					},
				],
				workflowId: 'workflow-1',
			},
		});

		expect(parsed?.payload).toEqual({
			requestId: 'request-1',
			toolCallId: 'tool-call-1',
			toolName: 'workflows',
			args: { action: 'setup' },
			inputThreadId: 'input-thread-1',
			severity: 'warning',
			message: 'Configure workflow',
			inputType: 'continue',
			setupRequests: [
				{
					node: {
						id: 'node-1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.2,
						parameters: {},
						position: [0, 0],
					},
					isTrigger: false,
				},
			],
			workflowId: 'workflow-1',
		});
		expect(parsed?.confirmation).toEqual({
			requestId: 'request-1',
			inputThreadId: 'input-thread-1',
			severity: 'warning',
			message: 'Configure workflow',
			inputType: 'continue',
			setupRequests: [
				{
					node: {
						id: 'node-1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.2,
						parameters: {},
						position: [0, 0],
					},
					isTrigger: false,
				},
			],
			workflowId: 'workflow-1',
		});
	});

	it('returns undefined without an effective tool call id', () => {
		expect(
			parseSuspendedToolCallConfirmation({
				toolCallId: '',
				toolName: 'ask-user',
				input: {},
				suspendPayload: { requestId: 'request-1' },
			}),
		).toBeUndefined();
	});
});
