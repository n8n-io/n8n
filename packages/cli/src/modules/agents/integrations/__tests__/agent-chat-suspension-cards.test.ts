import { buildSuspendCardPayload } from '../agent-chat-suspension-cards';

describe('buildSuspendCardPayload', () => {
	it('turns the action tool’s approval payload into an Approve/Deny card', () => {
		const card = buildSuspendCardPayload({
			type: 'approval',
			toolName: 'send_channel_message',
			displayName: 'send_channel_message → slack:C999',
			args: { channelId: 'slack:C999', message: { text: 'Hi' } },
		});

		expect(card).toEqual({
			title: 'Approval required',
			components: [
				{
					type: 'section',
					text: 'The agent wants to run this tool: send_channel_message → slack:C999',
				},
				{ type: 'fields', fields: [{ label: 'Tool', value: 'send_channel_message → slack:C999' }] },
				{ type: 'button', label: 'Approve', value: 'true', style: 'primary' },
				{ type: 'button', label: 'Deny', value: 'false', style: 'danger' },
			],
		});
	});

	it('leaves an interactive card suspension to the component mapper', () => {
		const card = buildSuspendCardPayload({
			type: 'integration_action',
			action: 'respond',
			integrationConnectionId: 'slack:cred-a',
			messageContext: null,
		});

		expect(card).toBeUndefined();
	});
});
