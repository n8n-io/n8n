import { Service } from '@n8n/di';
import type { ParsedHitlCallbackReference } from 'n8n-core';
import { parseHitlCallbackReference } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { HitlInteractionWebhooks } from './hitl-interaction-webhooks';
import type { WaitingWebhookRequest } from './webhook.types';

interface TelegramCallbackUpdate {
	callback_query?: {
		data?: string;
	};
}

/**
 * Resumes a Send and Wait execution from a Telegram callback-button tap. The reference travels
 * in `callback_query.data` and is HMAC-verified here; the `X-Telegram-Bot-Api-Secret-Token`
 * header is verified downstream by the Telegram node's handler (which holds the bot credential).
 */
@Service()
export class TelegramInteractionWebhooks extends HitlInteractionWebhooks {
	protected async parseCallback(
		req: WaitingWebhookRequest,
	): Promise<ParsedHitlCallbackReference | null> {
		await req.readRawBody();
		const update = jsonParse<TelegramCallbackUpdate>(req.rawBody?.toString() ?? '', {
			fallbackValue: {},
		});
		return parseHitlCallbackReference(update.callback_query?.data ?? '');
	}
}
