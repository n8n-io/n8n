import { Service } from '@n8n/di';
import type express from 'express';
import type { ParsedHitlCallbackReference } from 'n8n-core';
import { markSlackInteractionRequest, parseHitlCallbackReference } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { HitlInteractionWebhooks } from './hitl-interaction-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

interface SlackInteractionPayload {
	actions?: Array<{ value?: string }>;
}

/**
 * Resumes a Send and Wait execution from a Slack interactive button callback. The reference
 * travels in the clicked button's `value` and is HMAC-verified here; Slack's own
 * `x-slack-signature` is verified downstream by the Slack node's handler (which holds the secret).
 */
@Service()
export class SlackInteractionWebhooks extends HitlInteractionWebhooks {
	protected async parseCallback(
		req: WaitingWebhookRequest,
	): Promise<ParsedHitlCallbackReference | null> {
		await req.readRawBody();
		// Slack sends interactions as form data with the JSON inside a `payload` field.
		const payloadRaw = new URLSearchParams(req.rawBody?.toString() ?? '').get('payload');
		if (!payloadRaw) return null;
		const payload = jsonParse<SlackInteractionPayload>(payloadRaw, { fallbackValue: {} });
		return parseHitlCallbackReference(payload.actions?.[0]?.value ?? '');
	}

	/**
	 * Flag the request so the Slack node's webhook handler knows it arrived via this route
	 * and must hard-require a valid Slack signature (never the query-param approval fallback).
	 */
	protected beforeResume(req: WaitingWebhookRequest): void {
		markSlackInteractionRequest(req);
	}

	/**
	 * Slack also posts here for URL buttons (plain-link approval, free-text / custom-form "Respond"),
	 * which resume via the signed URL the button opens, not here. It requires a 200 ack even though
	 * there is nothing to resume — a non-2xx surfaces "the app responded with status code 400".
	 */
	protected handleUnrecognizedCallback(res: express.Response): IWebhookResponseCallbackData {
		res.status(200).send('');
		return { noWebhookResponse: true };
	}
}
