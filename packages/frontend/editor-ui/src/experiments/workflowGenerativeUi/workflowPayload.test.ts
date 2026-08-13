import { buildWorkflowUiPayload } from './workflowPayload';

describe('buildWorkflowUiPayload', () => {
	it('strips credentials and keeps parameters', () => {
		const payload = buildWorkflowUiPayload({
			name: 'Lead flow',
			nodes: [
				{
					id: '1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					credentials: { slackApi: { id: 'x', name: 'secret' } },
					parameters: { resource: 'message', operation: 'post', text: 'hi', channelId: '#sales' },
				},
			],
			connections: {},
		});
		expect(payload.nodes[0]).not.toHaveProperty('credentials');
		expect(payload.nodes[0].resource).toBe('message');
		expect(payload.nodes[0].operation).toBe('post');
		expect(payload.nodes[0].parameters).toEqual(
			expect.objectContaining({ text: 'hi', channelId: '#sales' }),
		);
	});
});
