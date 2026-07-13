import { Service } from '@n8n/di';
import type express from 'express';
import { jsonParse } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { WaitingWebhooks } from './waiting-webhooks';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from './webhook.types';

interface SlackInteractionValue {
	executionId?: string;
	nodeId?: string;
}

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
const SLACK_TOOL_NODE_TYPE = 'n8n-nodes-base.slackTool';

/**
 * Receives Slack interactive button callbacks and resumes the matching Send-and-Wait execution.
 */
@Service()
export class SlackInteractionWebhooks extends WaitingWebhooks {
	async executeWebhook(
		req: WaitingWebhookRequest,
		res: express.Response,
	): Promise<IWebhookResponseCallbackData> {
		// Only a POST carrying an x-slack-signature header is accepted here; this check only
		// asserts the header is present, not valid. Actual signature validity is enforced
		// downstream in the node, where the signing secret lives on the node credential rather
		// than at this layer. Rejecting header-less probes forces that node check to run on the
		// resume.
		if (req.method !== 'POST' || !req.headers['x-slack-signature']) {
			res.status(401).send('');
			return { noWebhookResponse: true };
		}

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

		this.logReceivedWebhook(req.method, value.executionId);
		sanitizeWebhookRequest(req);

		const execution = await this.getExecution(value.executionId);
		if (!execution) {
			throw new NotFoundError(`The execution "${value.executionId}" does not exist.`);
		}
		if (execution.status === 'running' || execution.finished) {
			res.status(409).send('');
			return { noWebhookResponse: true };
		}

		// Restrict resume to a Slack send-and-wait node. Other waiting nodes run no Slack
		// signature check, so they must not be resumable via this route. Guard the node that
		// actually resumes (lastNodeExecuted), and assert its id matches the button's nodeId —
		// the resume is coupled to it because the shared handler matches on webhook.path === suffix
		// and the send-and-wait path is the node id. Respond 404 (not a descriptive error) so the
		// response doesn't leak whether the node exists.
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		const { nodes } = this.createWorkflow(execution.workflowData);
		const targetNode = lastNodeExecuted ? nodes[lastNodeExecuted] : undefined;
		if (
			!lastNodeExecuted ||
			!targetNode ||
			targetNode.id !== value.nodeId ||
			(targetNode.type !== SLACK_NODE_TYPE && targetNode.type !== SLACK_TOOL_NODE_TYPE)
		) {
			res.status(404).send('');
			return { noWebhookResponse: true };
		}

		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId: value.executionId,
			suffix: value.nodeId,
		});
	}
}
