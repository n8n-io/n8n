/**
 * Compiled library node: a hand port of `n8n-nodes-base.telegram` version 1.2,
 * operation `message.sendMessage`.
 *
 * The bot token goes into the URL as a credential template. The runtime fills
 * it in (spec section 7). Reply markup is not supported.
 *
 * The attribution link ends with the instance id, which the converter passes
 * in `instanceId` (`ConvertOptions.instance`).
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface TelegramAdditionalFields {
	appendAttribution?: boolean;
	disable_notification?: boolean;
	disable_web_page_preview?: boolean;
	parse_mode?: string;
	reply_to_message_id?: number;
	message_thread_id?: number;
}

interface TelegramParameters {
	resource?: string;
	operation?: string;
	chatId?: string;
	text?: string;
	additionalFields?: TelegramAdditionalFields;
	instanceId?: string;
}

const ATTRIBUTION_LINK =
	'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram';

export default defineNode<TelegramParameters>({
	type: 'n8n-nodes-base.telegram',
	version: 1.2,
	supports: {
		resource: 'message',
		operation: { message: 'sendMessage' },
		operations: {
			'message.sendMessage': [
				'chatId',
				'text',
				'additionalFields',
				'additionalFields.appendAttribution',
				'additionalFields.disable_notification',
				'additionalFields.disable_web_page_preview',
				'additionalFields.parse_mode',
				'additionalFields.reply_to_message_id',
				'additionalFields.message_thread_id',
				'instanceId',
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		const resource = parameters.resource ?? 'message';
		const operation = parameters.operation ?? 'sendMessage';
		if (resource !== 'message' || operation !== 'sendMessage') {
			throw new Error(`Telegram: ${resource}.${operation} is not in the compiled library`);
		}
		const fields: TelegramAdditionalFields = { ...(parameters.additionalFields ?? {}) };
		const body: Record<string, unknown> = {
			chat_id: parameters.chatId ?? '',
			text: parameters.text ?? '',
		};
		// addAdditionalFields of the v1 node, for version 1.2.
		const append = fields.appendAttribution ?? true;
		// createUtmCampaignLink of the v1 node.
		const link = parameters.instanceId
			? `${ATTRIBUTION_LINK}_${parameters.instanceId}`
			: ATTRIBUTION_LINK;
		if (!fields.parse_mode) fields.parse_mode = 'Markdown';
		if (append) {
			const attribution = 'This message was sent automatically with ';
			if (fields.parse_mode === 'Markdown') {
				body.text = `${String(body.text)}\n\n_${attribution}_[n8n](${link})`;
			} else if (fields.parse_mode === 'HTML') {
				body.text = `${String(body.text)}\n\n<em>${attribution}</em><a href="${link}" target="_blank">n8n</a>`;
			}
		}
		body.disable_web_page_preview = true;
		for (const [key, value] of Object.entries(fields)) {
			if (key !== 'appendAttribution') body[key] = value;
		}
		const response = await ctx.http<Item>({
			method: 'POST',
			url: '{{$credentials.baseUrl}}/bot{{$credentials.accessToken}}/sendMessage',
			headers: {},
			qs: {},
			body,
			credential,
		});
		if (response.status >= 400) {
			throw new Error(`Telegram: HTTP status ${response.status}`);
		}
		return [response.body];
	},
});
