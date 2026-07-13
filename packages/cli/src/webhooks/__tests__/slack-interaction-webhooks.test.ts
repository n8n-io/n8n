import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import type { InstanceSettings } from 'n8n-core';
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

	/** Build a Slack interaction request whose button value carries the given ids. */
	const createRequest = (value: unknown) => {
		const payload = JSON.stringify({ actions: [{ value: JSON.stringify(value) }] });
		const req = mock<WaitingWebhookRequest>({ readRawBody: vi.fn().mockResolvedValue(undefined) });
		// Assign the real Buffer after construction so the deep mock does not proxy it.
		req.rawBody = Buffer.from(`payload=${encodeURIComponent(payload)}`);
		return req;
	};

	const createResponse = () => {
		const status = vi.fn().mockReturnThis();
		const send = vi.fn().mockReturnThis();
		return { res: mock<express.Response>({ status, send }), status, send };
	};

	it('responds 400 when the button value is missing the execution and node ids', async () => {
		const req = createRequest({});
		const { res, status } = createResponse();

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(executionPersistence.findSingleExecution).not.toHaveBeenCalled();
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toBeNull();
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

	it('routes the waiting execution into the shared resume with the parsed ids', async () => {
		const req = createRequest({ executionId: 'exec-1', nodeId: 'node-1' });
		const { res } = createResponse();
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: { resultData: { lastNodeExecuted: 'SlackNode' } },
			}),
		);

		const result = await slackInteractionWebhooks.executeWebhook(req, res);

		expect(result).toEqual({ noWebhookResponse: true });
		expect(slackInteractionWebhooks.getWebhookExecutionDataArgs).toEqual({
			executionId: 'exec-1',
			suffix: 'node-1',
		});
	});
});
