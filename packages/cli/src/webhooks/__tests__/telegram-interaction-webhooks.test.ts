import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import { buildHitlCallbackReference } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { TelegramInteractionWebhooks } from '@/webhooks/telegram-interaction-webhooks';
import type { WebhookService } from '@/webhooks/webhook.service';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';

const TEST_HMAC_SECRET = 'test-hmac-secret-key';

describe('TelegramInteractionWebhooks', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	const mockInstanceSettings = mock<InstanceSettings>({ hmacSignatureSecret: TEST_HMAC_SECRET });
	let svc: TelegramInteractionWebhooks;
	let getWebhookExecutionData: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		svc = new TelegramInteractionWebhooks(
			mock(),
			mock(),
			executionPersistence,
			mock<WebhookService>(),
			mockInstanceSettings,
			mock<EventService>(),
		);
		getWebhookExecutionData = vi.fn().mockResolvedValue({ noWebhookResponse: true });
		// Stub the shared resume so these tests focus on parsing, verification, and routing.
		(svc as unknown as { getWebhookExecutionData: unknown }).getWebhookExecutionData =
			getWebhookExecutionData;
	});

	// rawBody is assigned after construction: mock() proxies object overrides, which breaks
	// Buffer method receivers ("argument must be a buffer").
	const makeReq = (callbackData: string | undefined, method = 'POST') => {
		const req = mock<WaitingWebhookRequest>({ readRawBody: vi.fn(), method: method as never });
		req.rawBody = Buffer.from(
			JSON.stringify(callbackData === undefined ? {} : { callback_query: { data: callbackData } }),
		);
		return req;
	};

	const makeRes = () => {
		const res = mock<express.Response>();
		(res.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(res);
		return res;
	};

	it('responds 404 and does not resume for a non-POST request', async () => {
		const res = makeRes();

		const result = await svc.executeWebhook(makeReq(undefined, 'GET'), res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 400 and does not resume when the body carries no recognizable reference', async () => {
		const res = makeRes();

		const result = await svc.executeWebhook(makeReq(undefined), res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 404 and does not resume when the HMAC does not verify against this instance secret', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', 'a-different-secret');
		const res = makeRes();

		const result = await svc.executeWebhook(makeReq(reference), res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 404 and does not resume when the execution does not exist', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const res = makeRes();
		executionPersistence.findSingleExecution.mockResolvedValue(undefined);

		const result = await svc.executeWebhook(makeReq(reference), res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 409 and does not resume when the execution is already finished', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const res = makeRes();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'success',
				finished: true,
				data: { resultData: { lastNodeExecuted: 'Telegram', error: undefined } },
			}),
		);

		const result = await svc.executeWebhook(makeReq(reference), res);

		expect(res.status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 409 and does not resume when the execution is running', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const res = makeRes();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'running',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'Telegram', error: undefined } },
			}),
		);

		const result = await svc.executeWebhook(makeReq(reference), res);

		expect(res.status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('resolves the node id from lastNodeExecuted and routes into the shared resume', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const req = makeReq(reference);
		const res = makeRes();

		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'Telegram', error: undefined } },
				workflowData: {
					id: 'workflow-1',
					name: 'Test Workflow',
					active: true,
					settings: {},
					staticData: {},
					connections: {},
					nodes: [
						{
							name: 'Telegram',
							id: 'node-1',
							type: 'n8n-nodes-base.telegram',
							typeVersion: 1.2,
							parameters: {},
							position: [0, 0] as [number, number],
						},
					],
				},
			}),
		);

		await svc.executeWebhook(req, res);

		expect(getWebhookExecutionData).toHaveBeenCalledWith(
			expect.objectContaining({
				executionId: 'e1',
				suffix: 'node-1',
				lastNodeExecuted: 'Telegram',
			}),
		);
	});

	it('responds 404 and does not resume when lastNodeExecuted cannot be found in the workflow', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const req = makeReq(reference);
		const res = makeRes();

		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'Missing Node', error: undefined } },
				workflowData: {
					id: 'workflow-1',
					name: 'Test Workflow',
					active: true,
					settings: {},
					staticData: {},
					connections: {},
					nodes: [],
				},
			}),
		);

		const result = await svc.executeWebhook(req, res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});
});
