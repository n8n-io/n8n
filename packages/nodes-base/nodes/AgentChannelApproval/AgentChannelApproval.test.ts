import get from 'lodash/get';
import { mockDeep } from 'vitest-mock-extended';
import { NodeHelpers, WAIT_INDEFINITELY, type IExecuteFunctions, type INode } from 'n8n-workflow';
import { AgentChannelApproval } from './AgentChannelApproval.node';

function setup(channel: string, user = false) {
	const context = mockDeep<IExecuteFunctions>();
	const node: INode = {
		id: 'approval',
		name: 'Request approval',
		type: 'n8n-nodes-base.agentChannelApproval',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			channel,
			parameters: {
				authentication: channel === 'slack' ? 'accessToken' : 'botToken',
				message: 'Review this action',
				select: user ? 'user' : 'channel',
				sendTo: user ? 'user' : 'channel',
				chatId: '-123',
				channelId: { __rl: true, mode: 'id', value: 'C1' },
				userId: { __rl: true, mode: 'id', value: 'U1' },
				user: { __rl: true, mode: 'id', value: 'U1' },
				guildId: { __rl: true, mode: 'id', value: 'G1' },
				approvalOptions: {
					values: { approvalType: 'double', approveLabel: 'Approve', disapproveLabel: 'Deny' },
				},
				options: { appendAttribution: false },
			},
		},
	};
	context.getNode.mockReturnValue(node);
	context.getNodeParameter.mockImplementation((name, _index, fallback) =>
		get(node.parameters, name, fallback),
	);
	context.getApprovalCallbackReference.mockImplementation((decision) => `callback-${decision}`);
	context.getInputData.mockReturnValue([{ json: { message: 'input' } }]);
	context.getCredentials.mockResolvedValue({
		accessToken: 'token',
		baseUrl: 'https://api.telegram.org',
	});
	context.helpers.request.mockResolvedValue({ ok: true, result: {} });
	context.helpers.requestWithAuthentication.mockResolvedValue({ ok: true, body: { id: 'DM1' } });
	return { context, node };
}

it.each(['slack', 'telegram', 'discord'])(
	'delegates %s delivery and waiting with native Agent callbacks',
	async (channel) => {
		const { context, node } = setup(channel);
		const result = await new AgentChannelApproval().execute.call(context);
		const requests = [
			...context.helpers.request.mock.calls.map(([request]) => request),
			...context.helpers.requestWithAuthentication.mock.calls.map(([, request]) => request),
		];
		const sent = JSON.stringify(requests);
		expect(sent).toContain('Review this action');
		expect(sent).toContain('callback-approve');
		expect(sent).toContain('callback-decline');
		expect(sent).not.toContain('agent-review://');
		expect(context.getSignedResumeUrl).not.toHaveBeenCalled();
		expect(sent).not.toContain('setWebhook');
		expect(sent).toContain(
			channel === 'slack' ? 'action_id' : channel === 'telegram' ? 'callback_data' : 'custom_id',
		);
		expect(sent).toContain(channel === 'telegram' ? '-123' : 'C1');
		expect(context.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY);
		expect(result).toEqual([[{ json: { message: 'input' } }]]);
		expect(context.getNode()).toBe(node);
	},
);

it('preserves Discord direct-message setup before delivery', async () => {
	const { context } = setup('discord', true);
	await new AgentChannelApproval().execute.call(context);
	const requests = context.helpers.requestWithAuthentication.mock.calls.map(
		([, request]) => request,
	);
	expect(requests).toHaveLength(2);
	expect(requests[0].body).toEqual({ recipient_id: 'U1' });
	expect(JSON.stringify(requests[1])).toContain('DM1');
	expect(JSON.stringify(requests[1].body)).toContain('custom_id');
});

it('does not park the execution when delivery fails', async () => {
	const { context } = setup('slack');
	context.helpers.requestWithAuthentication.mockRejectedValue(new Error('Delivery failed'));
	await expect(new AgentChannelApproval().execute.call(context)).rejects.toThrow();
	expect(context.putExecutionToWait).not.toHaveBeenCalled();
});

it('keeps internal configuration when workflow parameters are normalized', () => {
	const { node } = setup('telegram');
	const description = new AgentChannelApproval().description;
	expect(
		NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			true,
			false,
			node,
			description,
		),
	).toEqual(node.parameters);
	expect(description.hidden).toBe(true);
});

it('rejects unsupported delegates', async () => {
	const { context } = setup('unknown');
	await expect(new AgentChannelApproval().execute.call(context)).rejects.toThrow('Unsupported');
	expect(context.helpers.request).not.toHaveBeenCalled();
	expect(context.putExecutionToWait).not.toHaveBeenCalled();
});

it('does not send an approval if its callback buttons cannot be created', async () => {
	const { context, node } = setup('slack');
	Object.assign(node.parameters.parameters!, {
		approvalOptions: { values: { approvalType: 'single' } },
	});
	await expect(new AgentChannelApproval().execute.call(context)).rejects.toThrow('review buttons');
	expect(context.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	expect(context.putExecutionToWait).not.toHaveBeenCalled();
});

it.each(['slack', 'telegram'])(
	'keeps %s channel approval setup in the Agent integration',
	async (channel) => {
		const { context, node } = setup(channel);
		Object.assign(node.parameters.parameters!, { chatApproval: true, captureResponder: true });
		await new AgentChannelApproval().execute.call(context);
		expect(
			context.helpers.request.mock.calls.some(([options]) =>
				JSON.stringify(options).includes('setWebhook'),
			),
		).toBe(false);
		expect(context.putExecutionToWait).toHaveBeenCalledOnce();
	},
);
