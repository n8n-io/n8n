import { NodeSchema } from '../node-catalog.schema';

describe('NodeSchema', () => {
	it('accepts a node catalog payload with operations and credentials', () => {
		const parsed = NodeSchema.parse({
			nodeId: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			description: 'Consume Slack API',
			credentials: [{ name: 'slackApi' }, { name: 'slackOAuth2Api' }],
			operations: [
				{
					id: 'slack.message.send',
					resource: 'message',
					operation: 'send',
					displayName: 'Send a message',
					description: 'Send a message to a channel',
					inputSchema: {
						type: 'object',
						properties: {
							channel: { type: 'string' },
							text: { type: 'string' },
						},
						required: ['channel', 'text'],
					},
				},
			],
		});

		expect(parsed.operations[0].id).toBe('slack.message.send');
	});
});
