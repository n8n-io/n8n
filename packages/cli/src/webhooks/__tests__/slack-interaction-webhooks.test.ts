import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import { buildHitlCallbackReference, isSlackInteractionRequest } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { SlackInteractionWebhooks } from '@/webhooks/slack-interaction-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from '@/webhooks/webhook.types';

const TEST_HMAC_SECRET = 'test-hmac-secret-key';

type GetWebhookExecutionDataArgs = {
	executionId: string;
	suffix?: string;
	req: WaitingWebhookRequest;
};

class TestSlackInteractionWebhooks extends SlackInteractionWebhooks {
	getWebhookExecutionDataArgs: GetWebhookExecutionDataArgs | null = null;

	// eslint-disable-next-line @typescript-eslint/require-await
	protected async getWebhookExecutionData(args: {
		executionId: string;
		suffix?: string;
		req: WaitingWebhookRequest;
	}): Promise<IWebhookResponseCallbackData> {
		this.getWebhookExecutionDataArgs = {
			executionId: args.executionId,
			suffix: args.suffix,
			req: args.req,
		};
		return { noWebhookResponse: true };
	}
}

describe('SlackInteractionWebhooks', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	const slackInteractionWebhooks = new TestSlackInteractionWebhooks(
		mock(),
		mock(),
		executionPersistence,
		mock(),
		mock<InstanceSettings>({ hmacSignatureSecret: TEST_HMAC_SECRET }),
		mock<EventService>(),
		mock(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		slackInteractionWebhooks.getWebhookExecutionDataArgs = null;
	});

	/**
	 * Build a Slack interaction request. `reference` is the callback value carried in the clicked
	 * button (normally minted by buildHitlCallbackReference); `opts` lets tests drop the method or
	 * supply a raw body directly.
	 */
	const createRequest = (
		reference: string | undefined,
		opts: { method?: string; rawBody?: string } = {},
	) => {
		const payload = JSON.stringify({
			actions: reference === undefined ? [] : [{ value: reference }],
		});
		const req = mock<WaitingWebhookRequest>({ readRawBody: vi.fn().mockResolvedValue(undefined) });
		req.method = (opts.method ?? 'POST') as WaitingWebhookRequest['method'];
		// Assign the real Buffer after construction so the deep mock does not proxy it.
		req.rawBody = Buffer.from(opts.rawBody ?? `payload=${encodeURIComponent(payload)}`);
		return req;
	};

	const createResponse = () => {
		const status = vi.fn().mockReturnThis();
		const send = vi.fn().mockReturnThis();
		return { res: mock<express.Response>({ status, send }), status, send };
	};

	/** A waiting execution whose workflow contains a single node with the given id. */
	const waitingExecutionWithNode = (nodeId: string, lastNodeExecuted = 'SlackNode') =>
		mock<IExecutionResponse>({
			status: 'waiting',
			finished: false,
			data: { resultData: { lastNodeExecuted, error: undefined } },
			workflowData: {
				id: 'workflow-1',
				name: 'Test Workflow',
				nodes: [
					{
						name: 'SlackNode',
						type: 'n8n-nodes-base.slack',
						typeVersion: 1,
						parameters: {},
						id: nodeId,
						position: [0, 0],
					},
				],
				connections: {},
				active: false,
				activeVersionId: null,
				settings: {},
				staticData: {},
				isArchived: false,
			} as unknown as IWorkflowBase,
		});

	it('responds 404 without resuming for a non-POST request', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference, { method: 'GET' });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	// Slack also fires interactions for URL buttons (plain-link, free-text / custom-form "Respond")
	// that carry no resumable reference. These must be acked with 200 (a non-2xx surfaces "the app
	// responded with status code 400") and must never resume the execution.
	it('acknowledges with 200 without resuming when the request has no payload field', async () => {
		const req = createRequest(undefined, { rawBody: 'foo=bar' });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(200);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('acknowledges with 200 without resuming when the button value is not a recognizable reference', async () => {
		const req = createRequest('not-a-reference');
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(200);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 404 without resuming when the HMAC does not verify against this instance secret', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', 'a-different-secret');
		const req = createRequest(reference);
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
		// A rejected request must never be flagged: marking happens only on the resume path.
		expect(isSlackInteractionRequest(req)).toBe(false);
	});

	it('responds 404 without resuming when the referenced execution does not exist', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(undefined);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 409 when the execution is already running', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'running', finished: false }),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 409 when the execution has already finished', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'waiting', finished: true }),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('responds 409 without resuming when the execution finished with an error', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { error: { message: 'boom' } } },
			}),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
		// Must not route into the shared resume machinery.
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 404 without resuming when lastNodeExecuted cannot be found in the workflow', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			waitingExecutionWithNode('node-1', 'Missing Node'),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('resolves the node id from lastNodeExecuted and routes into the shared resume', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(waitingExecutionWithNode('node-1'));

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toMatchObject({
			executionId: 'exec-1',
			suffix: 'node-1',
		});
		// The request must be flagged before routing into the shared resume so the Slack node
		// hard-requires a valid signature instead of falling back to the query-param approval path.
		const routedReq = slackInteractionWebhooks.getWebhookExecutionDataArgs!.req;
		expect(isSlackInteractionRequest(routedReq)).toBe(true);
	});

	it('strips n8n auth and browserId cookies before routing into the shared resume', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		// Assign real cookie values after construction so the deep mock does not proxy them.
		req.headers = { cookie: 'n8n-auth=token; n8n-browserId=bid; other=keep' };
		req.cookies = { 'n8n-auth': 'token', 'n8n-browserId': 'bid', other: 'keep' };
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(waitingExecutionWithNode('node-1'));

		await slackInteractionWebhooks.executeWebhook(req, res);

		const routedReq = slackInteractionWebhooks.getWebhookExecutionDataArgs!.req;
		expect(routedReq.headers.cookie).toBe('other=keep');
		expect(routedReq.cookies).toEqual({ other: 'keep' });
	});

	it('routes a verified decline reference into the shared resume', async () => {
		const reference = buildHitlCallbackReference('exec-1', 'd', TEST_HMAC_SECRET);
		const req = createRequest(reference);
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(waitingExecutionWithNode('node-1'));

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toMatchObject({
			executionId: 'exec-1',
			suffix: 'node-1',
		});
	});
});
