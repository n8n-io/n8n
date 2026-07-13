import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { EventService } from '@/events/event.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { SlackInteractionWebhooks } from '@/webhooks/slack-interaction-webhooks';
import type { IWebhookResponseCallbackData, WaitingWebhookRequest } from '@/webhooks/webhook.types';

type GetWebhookExecutionDataArgs = {
	executionId: string;
	suffix?: string;
};

class TestSlackInteractionWebhooks extends SlackInteractionWebhooks {
	getWebhookExecutionDataArgs: GetWebhookExecutionDataArgs | null = null;

	// Isolate the endpoint's parse/route logic from the shared resume machinery, which is
	// exercised by the WaitingWebhooks tests.
	// eslint-disable-next-line @typescript-eslint/require-await
	protected async getWebhookExecutionData(args: {
		executionId: string;
		suffix?: string;
	}): Promise<IWebhookResponseCallbackData> {
		this.getWebhookExecutionDataArgs = { executionId: args.executionId, suffix: args.suffix };
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
		mock<InstanceSettings>(),
		mock<EventService>(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		slackInteractionWebhooks.getWebhookExecutionDataArgs = null;
	});

	/**
	 * Build a Slack interaction request. Defaults to a signed POST whose button value carries
	 * the given ids; `opts` lets individual tests drop the signature/method or supply a raw body.
	 */
	const createRequest = (
		value: unknown,
		opts: { method?: string; hasSignature?: boolean; rawBody?: string } = {},
	) => {
		const payload = JSON.stringify({ actions: [{ value: JSON.stringify(value) }] });
		const req = mock<WaitingWebhookRequest>({ readRawBody: vi.fn().mockResolvedValue(undefined) });
		req.method = (opts.method ?? 'POST') as WaitingWebhookRequest['method'];
		req.headers = opts.hasSignature === false ? {} : { 'x-slack-signature': 'v0=abc' };
		// Assign the real Buffer after construction so the deep mock does not proxy it.
		req.rawBody = Buffer.from(opts.rawBody ?? `payload=${encodeURIComponent(payload)}`);
		return req;
	};

	const createResponse = () => {
		const status = vi.fn().mockReturnThis();
		const send = vi.fn().mockReturnThis();
		return { res: mock<express.Response>({ status, send }), status, send };
	};

	/** A waiting execution whose workflow contains a single node with the given id and type. */
	const waitingExecutionWithNode = (nodeId: string, nodeType: string) =>
		mock<IExecutionResponse>({
			status: 'waiting',
			finished: false,
			data: { resultData: { lastNodeExecuted: 'SlackNode' } },
			workflowData: {
				id: 'workflow-1',
				name: 'Test Workflow',
				nodes: [
					{
						name: 'SlackNode',
						type: nodeType,
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

	it('responds 401 without resuming when the request has no Slack signature', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' }, { hasSignature: false });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 401 without resuming for a non-POST request', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' }, { method: 'GET' });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it('responds 400 when the button value is missing the execution and node ids', async () => {
		const req = createRequest({});
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 400 when the request has no payload field', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' }, { rawBody: 'foo=bar' });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it('responds 400 when the button value is not valid JSON', async () => {
		const rawBody = `payload=${encodeURIComponent(
			JSON.stringify({ actions: [{ value: 'not-json' }] }),
		)}`;
		const req = createRequest({}, { rawBody });
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
	});

	it('throws NotFoundError when the referenced execution does not exist', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(undefined);

		await expect(slackInteractionWebhooks.executeWebhook(req, res)).rejects.toThrowError(
			NotFoundError,
		);
	});

	it('responds 409 when the execution is already running', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
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
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({ status: 'waiting', finished: true }),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(409);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('responds 404 without resuming when the target node is not a Slack node', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			waitingExecutionWithNode('node-1', 'n8n-nodes-base.httpRequest'),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 404 without resuming when the target node is missing', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'missing-node' });
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			waitingExecutionWithNode('node-1', 'n8n-nodes-base.slack'),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 404 without resuming when the referenced node is a Slack node but not the one awaiting resume', async () => {
		// Attacker supplies the id of a real Slack node (`node-1`) while a different, non-Slack node
		// (`node-2`) is the one actually waiting. The guard must key off lastNodeExecuted, not just
		// "any Slack node in the workflow".
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'WaitNode' } },
				workflowData: {
					id: 'workflow-1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'SlackNode',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							parameters: {},
							id: 'node-1',
							position: [0, 0],
						},
						{
							name: 'WaitNode',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1,
							parameters: {},
							id: 'node-2',
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
			}),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('responds 404 without resuming when no node has been recorded as last executed', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res, status } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: undefined } },
				workflowData: {
					id: 'workflow-1',
					name: 'Test Workflow',
					nodes: [
						{
							name: 'SlackNode',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							parameters: {},
							id: 'node-1',
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
			}),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(404);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
	});

	it('routes the waiting execution into the shared resume when the target is a Slack node', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			waitingExecutionWithNode('node-1', 'n8n-nodes-base.slack'),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toEqual({
			executionId: 'exec-1',
			suffix: 'node-1',
		});
	});

	it('routes the waiting execution into the shared resume when the target is a Slack tool node', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			waitingExecutionWithNode('node-1', 'n8n-nodes-base.slackTool'),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toEqual({
			executionId: 'exec-1',
			suffix: 'node-1',
		});
	});
});
