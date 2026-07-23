import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import type { ParsedHitlCallbackReference } from 'n8n-core';
import { verifyHitlCallbackReference } from 'n8n-core';

import { WaitingWebhooks } from './waiting-webhooks';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

interface ValidatedCallback {
	execution: IExecutionResponse;
	executionId: string;
	lastNodeExecuted: string;
	nodeId: string;
}

type ValidationResult = { ok: true; value: ValidatedCallback } | { ok: false; status: number };

/**
 * Shared base for the fixed-URL HITL interaction webhook handlers (Slack, Telegram).
 * The Send and Wait reference travels in the request body (not the URL) and is verified
 * here via HMAC; the platform's own request-authenticity check happens downstream in that
 * node's webhook handler. Subclasses supply how to read the reference (`parseCallback`) and
 * may mark the request before it resumes (`beforeResume`).
 */
export abstract class HitlInteractionWebhooks extends WaitingWebhooks {
	protected reject(res: express.Response, status: number): IWebhookResponseCallbackData {
		res.status(status).send('');
		return { noWebhookResponse: true };
	}

	/** Parses the raw HTTP body into a typed callback reference, or null if malformed. */
	protected abstract parseCallback(
		req: WaitingWebhookRequest,
	): Promise<ParsedHitlCallbackReference | null>;

	/**
	 * Response when the request carries no resumable reference. Defaults to 400; platforms
	 * that also deliver fire-and-forget interactions here (Slack URL buttons) override to 200.
	 */
	protected handleUnrecognizedCallback(res: express.Response): IWebhookResponseCallbackData {
		return this.reject(res, 400);
	}

	/** Runs after the callback is verified and confirmed resumable, before the shared resume. */
	protected beforeResume(_req: WaitingWebhookRequest): void {}

	/** Checks that the reference is authentic and the execution exists and is still resumable. */
	private async validate(parsed: ParsedHitlCallbackReference): Promise<ValidationResult> {
		if (!verifyHitlCallbackReference(parsed, this.instanceSettings.hmacSignatureSecret)) {
			// Don't reveal whether the execution id exists.
			return { ok: false, status: 404 };
		}

		const execution = await this.getExecution(parsed.executionId);
		if (!execution) return { ok: false, status: 404 };

		if (execution.status === 'running' || execution.finished || execution.data?.resultData?.error) {
			// Replayed or late interaction: nothing left to resume.
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
		// Strip n8n auth/browserId cookies before node code sees the request.
		sanitizeWebhookRequest(req);

		if (req.method !== 'POST') return this.reject(res, 404);

		const parsed: ParsedHitlCallbackReference | null = await this.parseCallback(req);
		if (!parsed) return this.handleUnrecognizedCallback(res);

		const validated: ValidationResult = await this.validate(parsed);
		if (!validated.ok) return this.reject(res, validated.status);

		this.beforeResume(req);

		// Delegate to the shared resume machinery.
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
