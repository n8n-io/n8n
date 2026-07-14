import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type express from 'express';
import type { ParsedHitlCallbackReference } from 'n8n-core';
import { parseHitlCallbackReference, verifyHitlCallbackReference } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import { WaitingWebhooks } from './waiting-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

interface TelegramCallbackUpdate {
	callback_query?: {
		data?: string;
	};
}

interface ValidatedCallback {
	execution: IExecutionResponse;
	executionId: string;
	lastNodeExecuted: string;
	nodeId: string;
}

type ValidationResult = { ok: true; value: ValidatedCallback } | { ok: false; status: number };

/**
 * Receives Telegram callback-button taps (one fixed URL, registered directly
 * by the Telegram node when the bot's webhook is free) and resumes the
 * matching Send and Wait execution. The reference travels in `callback_query.data`
 * and is verified here via HMAC; it carries no Telegram credential, so the
 * `X-Telegram-Bot-Api-Secret-Token` header is verified downstream by the
 * Telegram node's own webhook handler, which holds the bot credential.
 */
@Service()
export class TelegramInteractionWebhooks extends WaitingWebhooks {
	private reject(res: express.Response, status: number): IWebhookResponseCallbackData {
		res.status(status).send('');
		return { noWebhookResponse: true };
	}

	/** Transform: raw HTTP body -> the typed callback reference, or null if malformed. */
	private async parseCallback(
		req: WaitingWebhookRequest,
	): Promise<ParsedHitlCallbackReference | null> {
		await req.readRawBody();
		const update = jsonParse<TelegramCallbackUpdate>(req.rawBody?.toString() ?? '', {
			fallbackValue: {},
		});
		return parseHitlCallbackReference(update.callback_query?.data ?? '');
	}

	/** Validate: reference is authentic, execution exists and is still resumable. */
	private async validate(parsed: ParsedHitlCallbackReference): Promise<ValidationResult> {
		if (!verifyHitlCallbackReference(parsed, this.instanceSettings.hmacSignatureSecret)) {
			// Don't reveal whether the execution id exists.
			return { ok: false, status: 404 };
		}

		const execution = await this.getExecution(parsed.executionId);
		if (!execution) return { ok: false, status: 404 };

		if (execution.status === 'running' || execution.finished || execution.data?.resultData?.error) {
			// Replayed or late tap: nothing left to resume.
			return { ok: false, status: 409 };
		}

		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
		const workflow = this.createWorkflow(execution.workflowData);
		const nodeId = workflow.getNode(lastNodeExecuted)?.id;
		if (!nodeId) return { ok: false, status: 404 };

		return {
			ok: true,
			value: { execution, executionId: parsed.executionId, lastNodeExecuted, nodeId },
		};
	}

	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		if (req.method !== 'POST') return this.reject(res, 404);

		const parsed: ParsedHitlCallbackReference | null = await this.parseCallback(req);
		if (!parsed) return this.reject(res, 400);

		const validated: ValidationResult = await this.validate(parsed);
		if (!validated.ok) return this.reject(res, validated.status);

		// Business logic: delegate to the shared resume machinery.
		const { execution, executionId, lastNodeExecuted, nodeId } = validated.value;
		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId,
			suffix: nodeId,
		});
	}
}
