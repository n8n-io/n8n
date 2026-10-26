import type { ChannelHitlDefinition } from '../../channel-hitl';
import { approvalNode } from '../../channel-hitl';
import { UserError } from 'n8n-workflow';

export const telegramHitl: ChannelHitlDefinition = {
	supported: true,
	fields: [{ name: 'recipient', type: 'text', kinds: ['user'] }],
	async listOptions() {
		return { options: [] };
	},
	createNode(configuration) {
		if (configuration.recipient.kind !== 'user' || !/^\d+$/.test(configuration.recipient.id))
			throw new UserError('Enter a numeric Telegram user ID. The user must first message the bot.');
		return approvalNode('n8n-nodes-base.telegram', 1.2, 'telegramApi', configuration, {
			chatId: configuration.recipient.id,
			message: "={{ $json.message.replace(/([_*`\\[\\]])/g, '\\\\$1') }}",
		});
	},
};
