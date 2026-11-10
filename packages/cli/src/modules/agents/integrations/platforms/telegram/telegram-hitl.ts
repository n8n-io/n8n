import type { ChannelHitlDefinition } from '../../channel-hitl';
import { approvalNode, matchesApprovalUser } from '../../channel-hitl';
import { UserError } from '@n8n/errors';

export const telegramHitl: ChannelHitlDefinition = {
	supported: true,
	channel: 'telegram',
	nodeType: 'n8n-nodes-base.telegram',
	credentialType: 'telegramApi',
	matchesResponse(node, event) {
		return matchesApprovalUser(node.parameters.chatId, event);
	},
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
