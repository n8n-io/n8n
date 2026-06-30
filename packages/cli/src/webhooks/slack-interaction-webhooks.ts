import { Service } from '@n8n/di';
import type express from 'express';
import { jsonParse } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { WaitingWebhooks } from './waiting-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

interface SlackInteractionValue {
	executionId?: string;
	nodeId?: string;
}

/**
 * Receives Slack interactive button callbacks (one app-configured URL) and resumes the
 * matching Send-and-Wait execution. The run/node ids travel in the button value; the Slack
 * signature is verified inside the Slack node's webhook handler, so this service only parses
 * the callback and routes it into the shared waiting-webhook resume.
 */
@Service()
export class SlackInteractionWebhooks extends WaitingWebhooks {
	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		await req.readRawBody();
		const payloadRaw = new URLSearchParams(req.rawBody?.toString() ?? '').get('payload');
		const payload = payloadRaw
			? jsonParse<{ actions?: Array<{ value?: string }> }>(payloadRaw, { fallbackValue: {} })
			: {};
		const value = jsonParse<SlackInteractionValue>(payload.actions?.[0]?.value ?? '', {
			fallbackValue: {},
		});

		if (!value.executionId || !value.nodeId) {
			res.status(400).send('');
			return { noWebhookResponse: true };
		}

		// The parsed payload becomes the request body (the Slack node reads the responder from it);
		// the ids drive webhook matching in the shared resume.
		req.params = { path: value.executionId, suffix: value.nodeId };
		req.body = payload;

		const execution = await this.getExecution(value.executionId);
		if (!execution) {
			throw new NotFoundError(`The execution "${value.executionId}" does not exist.`);
		}
		if (execution.status === 'running' || execution.finished) {
			res.status(409).send('');
			return { noWebhookResponse: true };
		}

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted: execution.data.resultData.lastNodeExecuted as string,
			executionId: value.executionId,
			suffix: value.nodeId,
		});
	}
}
