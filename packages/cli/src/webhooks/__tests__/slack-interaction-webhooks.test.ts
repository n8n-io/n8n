import type { IExecutionResponse } from '@n8n/db';
import type express from 'express';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { SlackInteractionWebhooks } from '@/webhooks/slack-interaction-webhooks';
import type { WaitingWebhookRequest } from '@/webhooks/webhook.types';

describe('SlackInteractionWebhooks', () => {
	const executionPersistence = mock<ExecutionPersistence>();
	let svc: SlackInteractionWebhooks;
	let getWebhookExecutionData: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		svc = new SlackInteractionWebhooks(
			mock(),
			mock(),
			executionPersistence,
			mock(),
			mock(),
			mock(),
		);
		getWebhookExecutionData = vi.fn().mockResolvedValue({ noWebhookResponse: true });
		// Stub the shared resume so the test focuses on parsing + routing.
		(svc as unknown as { getWebhookExecutionData: unknown }).getWebhookExecutionData =
			getWebhookExecutionData;
	});

	const makeReq = (payloadObj: unknown) =>
		mock<WaitingWebhookRequest>({
			rawBody: Buffer.from('payload=' + encodeURIComponent(JSON.stringify(payloadObj))),
			readRawBody: vi.fn(),
		});

	it('responds 400 and does not resume when the payload lacks execution/node ids', async () => {
		const res = mock<express.Response>();
		(res.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(res);

		const result = await svc.executeWebhook(makeReq({ actions: [{ value: '{}' }] }), res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(getWebhookExecutionData).not.toHaveBeenCalled();
	});

	it('routes a valid interaction into the shared resume with the payload ids', async () => {
		executionPersistence.findSingleExecution.mockResolvedValue(
			mock<IExecutionResponse>({
				status: 'waiting',
				finished: false,
				data: mock({ resultData: { lastNodeExecuted: 'Slack' } }),
			}),
		);
		const req = makeReq({
			actions: [
				{
					action_id: 'n8n_hitl_approve',
					value: JSON.stringify({ executionId: 'e1', nodeId: 'n1' }),
				},
			],
			user: { id: 'U1', name: 'Ada' },
		});

		await svc.executeWebhook(req, mock<express.Response>());

		expect(getWebhookExecutionData).toHaveBeenCalledWith(
			expect.objectContaining({ executionId: 'e1', suffix: 'n1', lastNodeExecuted: 'Slack' }),
		);
		expect(req.params).toEqual({ path: 'e1', suffix: 'n1' });
	});
});
