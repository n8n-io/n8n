import type { EventService } from '@n8n/backend-services';
import type { IExecutionResponse } from '@n8n/db';
import type { ExecutionSnapshot } from '@n8n/engine';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import { buildHitlCallbackReference, isTelegramInteractionRequest } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
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
			mock(),
			mock(),
			mock(),
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

	it('flags the request as arriving on this route before routing into the shared resume', async () => {
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

		expect(isTelegramInteractionRequest(req)).toBe(false);

		await svc.executeWebhook(req, res);

		const [{ req: routedReq }] = getWebhookExecutionData.mock.calls[0] as [
			{ req: WaitingWebhookRequest },
		];
		expect(isTelegramInteractionRequest(routedReq)).toBe(true);
	});

	it('does not flag a request that never reaches the resume step', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', 'a-different-secret');
		const req = makeReq(reference);

		await svc.executeWebhook(req, makeRes());

		expect(isTelegramInteractionRequest(req)).toBe(false);
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

	it('responds 404 and does not resume when the resumed node has no id', async () => {
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
							id: '',
							type: 'n8n-nodes-base.telegram',
							typeVersion: 1.2,
							parameters: {},
							position: [0, 0] as [number, number],
						},
					],
				},
			}),
		);

		const result = await svc.executeWebhook(req, res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('responds 404 and does not resume when the resumed node is not a Telegram node', async () => {
		const reference = buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET);
		const req = makeReq(reference);
		const res = makeRes();

		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'Slack', error: undefined } },
				workflowData: {
					id: 'workflow-1',
					name: 'Test Workflow',
					active: true,
					settings: {},
					staticData: {},
					connections: {},
					nodes: [
						{
							name: 'Slack',
							id: 'node-1',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							parameters: {},
							position: [0, 0] as [number, number],
						},
					],
				},
			}),
		);

		const result = await svc.executeWebhook(req, res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	describe('on engine v2', () => {
		const EXECUTION_ID = '01a038ae-0000-7000-8000-000000000001';
		const STEP_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfb';
		const reference = 'nhitl2|callback';
		const dataPlane = mock<EngineDataPlaneProxyService>();
		const executionReader = mock<EngineV2ExecutionReader>();
		const snapshot = { id: EXECUTION_ID } as unknown as ExecutionSnapshot;
		const target = { stepId: STEP_ID, nodeId: 'node-1' };

		const standIn = (type = 'n8n-nodes-base.telegram') =>
			({
				id: EXECUTION_ID,
				workflowData: { nodes: [{ name: 'Telegram', id: 'node-1', type, parameters: {} }] },
				data: { resultData: { runData: {} } },
			}) as unknown as IExecutionResponse;

		beforeEach(() => {
			svc = new TelegramInteractionWebhooks(
				mock(),
				mock(),
				executionPersistence,
				mock<WebhookService>(),
				mockInstanceSettings,
				mock<EventService>(),
				mock(),
				dataPlane,
				executionReader,
			);
			(svc as unknown as { getWebhookExecutionData: unknown }).getWebhookExecutionData =
				getWebhookExecutionData;
			dataPlane.readApprovalCallback.mockImplementation((ref) =>
				ref === reference ? STEP_ID : undefined,
			);
			dataPlane.locateResume.mockResolvedValue({
				ok: true,
				value: { execution: snapshot, target },
			});
			executionReader.fromSnapshot.mockResolvedValue(standIn());
		});

		it('locates the callback by its step id and resumes the step under the execution id', async () => {
			const req = makeReq(reference);

			await svc.executeWebhook(req, makeRes());

			expect(dataPlane.locateResume).toHaveBeenCalledWith({ id: STEP_ID, token: reference });
			expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
			expect(isTelegramInteractionRequest(req)).toBe(true);
			expect(getWebhookExecutionData).toHaveBeenCalledWith(
				expect.objectContaining({
					executionId: EXECUTION_ID,
					suffix: 'node-1',
					lastNodeExecuted: 'Telegram',
					engineResume: { stepId: STEP_ID, token: reference },
				}),
			);
		});

		it.each([
			[401, 'invalid_token', 404],
			[404, 'not_found', 404],
			[409, 'not_waiting', 409],
		])('answers a %i %s refusal of the data plane with %i', async (status, error, answer) => {
			dataPlane.locateResume.mockResolvedValue({ ok: false, status, error });
			const res = makeRes();

			await svc.executeWebhook(makeReq(reference), res);

			expect(res.status).toHaveBeenCalledWith(answer);
			expect(getWebhookExecutionData).not.toHaveBeenCalled();
		});

		it('answers 409 when no step accepts the callback', async () => {
			dataPlane.locateResume.mockResolvedValue({
				ok: true,
				value: { execution: snapshot, target: null },
			});
			const res = makeRes();

			await svc.executeWebhook(makeReq(reference), res);

			expect(res.status).toHaveBeenCalledWith(409);
			expect(getWebhookExecutionData).not.toHaveBeenCalled();
		});

		it('answers 404 when the waiting node is not a Telegram node', async () => {
			executionReader.fromSnapshot.mockResolvedValue(standIn('n8n-nodes-base.slack'));
			const res = makeRes();

			await svc.executeWebhook(makeReq(reference), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(getWebhookExecutionData).not.toHaveBeenCalled();
		});

		it('resumes a callback that the data plane does not read on v1', async () => {
			executionPersistence.findSingleExecution.mockResolvedValue(undefined);

			await svc.executeWebhook(
				makeReq(buildHitlCallbackReference('e1', 'a', TEST_HMAC_SECRET)),
				makeRes(),
			);

			expect(executionPersistence.findSingleExecution).toHaveBeenCalled();
			expect(dataPlane.locateResume).not.toHaveBeenCalled();
		});
	});
});
