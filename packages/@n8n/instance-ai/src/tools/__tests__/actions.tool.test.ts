import type { InstanceAiPermissions } from '@n8n/api-types';

import type {
	HubActionExecutionResult,
	InstanceAiActionService,
	InstanceAiContext,
} from '../../types';
import { createActionsTool } from '../actions.tool';

type MockInstanceAiContext = InstanceAiContext & {
	actionService: jest.Mocked<InstanceAiActionService>;
};

function createActionService(): jest.Mocked<InstanceAiActionService> {
	return {
		search: jest.fn().mockResolvedValue({ results: [] }),
		describe: jest.fn().mockResolvedValue(null),
		resolveAction: jest.fn().mockResolvedValue(null),
		listCredentials: jest.fn().mockResolvedValue({ credentials: [] }),
		execute: jest.fn().mockResolvedValue({
			executionId: 'execution-1',
			status: 'success',
		}),
	};
}

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions' | 'actionService'>> & {
		actionService?: jest.Mocked<InstanceAiActionService>;
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): MockInstanceAiContext {
	const { actionService = createActionService(), ...rest } = overrides;

	return {
		userId: 'user-1',
		workflowService: {} as never,
		executionService: {} as never,
		credentialService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		permissions: {},
		...rest,
		actionService,
	} as unknown as MockInstanceAiContext;
}

function createAgentCtx(opts: { resumeData?: unknown; suspend?: jest.Mock } = {}) {
	return {
		agent: {
			resumeData: opts.resumeData,
			suspend: opts.suspend ?? jest.fn(),
		},
	};
}

function getSuspendPayload(suspend: jest.Mock): Record<string, unknown> {
	return suspend.mock.calls[0][0] as Record<string, unknown>;
}

describe('actions tool', () => {
	it('delegates search to actionService.search', async () => {
		const context = createMockContext();
		const resultPayload = {
			results: [
				{
					id: 'slack.message.send',
					nodeId: 'n8n-nodes-base.slack',
					resource: 'message',
					operation: 'send',
					displayName: 'Send a message',
					description: 'Send a Slack message',
					inputSchema: { type: 'object' as const, properties: {} },
					userCredentials: [{ id: 'cred-1', name: 'Acme Slack' }],
				},
			],
		};
		context.actionService.search.mockResolvedValue(resultPayload);

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'search', query: 'slack send', hasCredential: true },
			{} as never,
		);

		expect(context.actionService.search).toHaveBeenCalledWith({
			query: 'slack send',
			hasCredential: true,
		});
		expect(result).toEqual(resultPayload);
	});

	it('delegates describe to actionService.describe', async () => {
		const context = createMockContext();
		const descriptor = {
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			description: 'Consume Slack API',
			credentials: [{ name: 'slackOAuth2Api' }],
			operations: [],
		};
		context.actionService.describe.mockResolvedValue(descriptor);

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'describe', nodeId: 'n8n-nodes-base.slack' },
			{} as never,
		);

		expect(context.actionService.describe).toHaveBeenCalledWith('n8n-nodes-base.slack');
		expect(result).toEqual(descriptor);
	});

	it('delegates resolveAction to actionService.resolveAction', async () => {
		const context = createMockContext();
		const descriptor = {
			id: 'slack.message.send',
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack - Send a message',
			nodeDisplayName: 'Slack',
			operationDisplayName: 'Send a message',
			inputSchema: { type: 'object' as const, properties: {} },
		};
		context.actionService.resolveAction.mockResolvedValue(descriptor);

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'resolveAction', actionId: 'slack.message.send' },
			{} as never,
		);

		expect(context.actionService.resolveAction).toHaveBeenCalledWith('slack.message.send');
		expect(result).toEqual(descriptor);
	});

	it('delegates list-credentials to actionService.listCredentials', async () => {
		const context = createMockContext();
		const credentials = {
			credentials: [{ id: 'cred-1', name: 'Acme Slack', type: 'slackOAuth2Api' }],
		};
		context.actionService.listCredentials.mockResolvedValue(credentials);

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{
				action: 'list-credentials',
				nodeType: 'n8n-nodes-base.slack',
				actionId: 'slack.message.send',
			},
			{} as never,
		);

		expect(context.actionService.listCredentials).toHaveBeenCalledWith({
			nodeType: 'n8n-nodes-base.slack',
			actionId: 'slack.message.send',
		});
		expect(result).toEqual(credentials);
	});

	it('executes dry runs without suspending', async () => {
		const executionResult: HubActionExecutionResult = {
			executionId: '',
			status: 'dry_run',
			wouldExecute: { nodeType: 'n8n-nodes-base.slack' },
		};
		const context = createMockContext();
		context.actionService.execute.mockResolvedValue(executionResult);
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{
				action: 'execute',
				id: 'slack.message.send',
				params: { text: 'hello' },
				credentialId: 'cred-1',
				dryRun: true,
			},
			createAgentCtx({ suspend }) as never,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(context.actionService.execute).toHaveBeenCalledWith({
			id: 'slack.message.send',
			params: { text: 'hello' },
			credentialId: 'cred-1',
			dryRun: true,
		});
		expect(result).toEqual(executionResult);
	});

	it('returns denied when runWorkflow permission is blocked', async () => {
		const context = createMockContext({
			permissions: { runWorkflow: 'blocked' },
		});
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ suspend }) as never,
		);

		expect(result).toEqual({
			executionId: '',
			status: 'error',
			denied: true,
			reason: 'Action blocked by admin',
		});
		expect(suspend).not.toHaveBeenCalled();
		expect(context.actionService.execute).not.toHaveBeenCalled();
	});

	it('suspends live execution with warning severity by default', async () => {
		const context = createMockContext();
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ suspend }) as never,
		);

		expect(getSuspendPayload(suspend)).toEqual(
			expect.objectContaining({
				requestId: expect.any(String),
				message: 'Execute slack.message.send?',
				severity: 'warning',
			}),
		);
		expect(result).toEqual({
			executionId: '',
			status: 'error',
			denied: true,
			reason: 'Awaiting confirmation',
		});
		expect(context.actionService.execute).not.toHaveBeenCalled();
	});

	it('resolves action and credential labels before suspending', async () => {
		const context = createMockContext();
		context.actionService.resolveAction.mockResolvedValue({
			id: 'slack.message.send',
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack — Send a message',
			nodeDisplayName: 'Slack',
			operationDisplayName: 'Send a message',
			inputSchema: {
				type: 'object' as const,
				properties: {
					channel: { title: 'Channel' },
					text: { title: 'Text' },
					limit: { title: 'Limit' },
					authentication: { title: 'Authentication' },
				},
			},
		});
		context.actionService.listCredentials.mockResolvedValue({
			credentials: [{ id: 'cred-1', name: 'Acme Slack', type: 'slackOAuth2Api' }],
		});
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		await tool.execute!(
			{
				action: 'execute',
				id: 'slack.message.send',
				credentialId: 'cred-1',
				params: { authentication: 'accessToken', channel: 'C123', text: 'hello', limit: 50 },
			},
			createAgentCtx({ suspend }) as never,
		);

		expect(context.actionService.resolveAction).toHaveBeenCalledWith('slack.message.send');
		expect(context.actionService.listCredentials).toHaveBeenCalledWith({
			actionId: 'slack.message.send',
		});
		expect(getSuspendPayload(suspend)).toEqual(
			expect.objectContaining({
				message:
					'Execute Slack — Send a message using credential "Acme Slack" with channel: "C123", text: "hello", and limit: 50?',
				severity: 'warning',
				hubActionExecution: {
					actionId: 'slack.message.send',
					nodeType: 'n8n-nodes-base.slack',
					actionDisplayName: 'Slack — Send a message',
					nodeDisplayName: 'Slack',
					operationDisplayName: 'Send a message',
					parameters: [
						{ label: 'Channel', value: '"C123"' },
						{ label: 'Text', value: '"hello"' },
						{ label: 'Limit', value: '50' },
					],
					credential: { id: 'cred-1', name: 'Acme Slack', type: 'slackOAuth2Api' },
				},
			}),
		);
	});

	it('uses the bare action label when no credentialId is provided', async () => {
		const context = createMockContext();
		context.actionService.resolveAction.mockResolvedValue({
			id: 'slack.message.send',
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack — Send a message',
			nodeDisplayName: 'Slack',
			operationDisplayName: 'Send a message',
			inputSchema: { type: 'object' as const, properties: {} },
		});
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ suspend }) as never,
		);

		expect(context.actionService.listCredentials).not.toHaveBeenCalled();
		expect(getSuspendPayload(suspend)).toEqual(
			expect.objectContaining({
				message: 'Execute Slack — Send a message?',
				hubActionExecution: {
					actionId: 'slack.message.send',
					nodeType: 'n8n-nodes-base.slack',
					actionDisplayName: 'Slack — Send a message',
					nodeDisplayName: 'Slack',
					operationDisplayName: 'Send a message',
					parameters: [],
				},
			}),
		);
		const payload = getSuspendPayload(suspend);
		expect(payload).not.toHaveProperty('hubActionExecution.credential');
	});

	it('falls back to raw action and credential ids when confirmation lookups fail', async () => {
		const context = createMockContext();
		context.actionService.resolveAction.mockRejectedValue(new Error('lookup failed'));
		context.actionService.listCredentials.mockRejectedValue(new Error('credential lookup failed'));
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		await tool.execute!(
			{
				action: 'execute',
				id: 'slack.message.send',
				credentialId: 'cred-1',
			},
			createAgentCtx({ suspend }) as never,
		);

		expect(getSuspendPayload(suspend)).toEqual(
			expect.objectContaining({
				message: 'Execute slack.message.send using credential "cred-1"?',
			}),
		);
		const payload = getSuspendPayload(suspend);
		expect(payload).not.toHaveProperty('hubActionExecution');
	});

	it('returns denied when resumed with approval=false', async () => {
		const context = createMockContext();

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ resumeData: { approved: false } }) as never,
		);

		expect(result).toEqual({
			executionId: '',
			status: 'error',
			denied: true,
			reason: 'User denied the action',
		});
		expect(context.actionService.execute).not.toHaveBeenCalled();
	});

	it('executes when resumed with approval=true', async () => {
		const executionResult: HubActionExecutionResult = {
			executionId: 'execution-1',
			status: 'success',
		};
		const context = createMockContext();
		context.actionService.execute.mockResolvedValue(executionResult);

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{
				action: 'execute',
				id: 'slack.message.send',
				params: { text: 'hello' },
				credentialId: 'cred-1',
			},
			createAgentCtx({ resumeData: { approved: true } }) as never,
		);

		expect(context.actionService.execute).toHaveBeenCalledWith({
			id: 'slack.message.send',
			params: { text: 'hello' },
			credentialId: 'cred-1',
			dryRun: undefined,
		});
		expect(result).toEqual(executionResult);
	});

	it('returns a structured error when live action execution rejects', async () => {
		const context = createMockContext();
		context.actionService.execute.mockRejectedValue(new Error('execution_data duplicate'));

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ resumeData: { approved: true } }) as never,
		);

		expect(result).toEqual({
			executionId: '',
			status: 'error',
			error: 'execution_data duplicate',
		});
	});

	it('executes immediately when runWorkflow permission is always_allow', async () => {
		const executionResult: HubActionExecutionResult = {
			executionId: 'execution-1',
			status: 'success',
		};
		const context = createMockContext({
			permissions: { runWorkflow: 'always_allow' },
		});
		context.actionService.execute.mockResolvedValue(executionResult);
		const suspend = jest.fn();

		const tool = createActionsTool(context);
		const result = await tool.execute!(
			{ action: 'execute', id: 'slack.message.send' },
			createAgentCtx({ suspend }) as never,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(context.actionService.execute).toHaveBeenCalledWith({
			id: 'slack.message.send',
			params: undefined,
			credentialId: undefined,
			dryRun: undefined,
		});
		expect(result).toEqual(executionResult);
	});
});
