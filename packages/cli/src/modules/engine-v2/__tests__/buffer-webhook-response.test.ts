import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { EngineConfig } from '@n8n/config';
import type { StepExecutionRequest } from '@n8n/engine';
import { attachResponseHooks } from '@n8n/node-engine-compatibility';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createExecutionIdV2 } from '@/executions/execution-id';
import { EngineV2WebhookResponder } from '@/services/engine-v2-webhook-responder.service';

import { InMemoryExecutionResponseChannel } from '../response-channel/in-memory-execution-response-channel';
import { InMemoryExecutionResponseReceiver } from '../response-channel/in-memory-execution-response-receiver';
import { InMemoryExecutionResponseSender } from '../response-channel/in-memory-execution-response-sender';

/**
 * The whole path a Buffer webhook response takes between the planes: the v1
 * `sendResponse` hook on the data plane, the in-memory sender and receiver, and
 * the responder that settles the pending request on the control plane. The
 * HTTP write itself is covered by the webhook helper tests.
 */
describe('a Buffer webhook response through the response channel', () => {
	const bytes = Buffer.from([0x00, 0xff, 0x10, 0x80]);
	const headers = { 'content-type': 'image/png', 'content-length': bytes.length };

	const buildPath = () => {
		const channel = new InMemoryExecutionResponseChannel();
		const sender = new InMemoryExecutionResponseSender(channel, mockLogger());
		const receiver = new InMemoryExecutionResponseReceiver(channel, mockLogger());

		const responder = new EngineV2WebhookResponder(
			mock<EngineConfig>({ webhookResponseTimeout: 50_000 }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);
		responder.useReceiver(receiver);

		const executionId = createExecutionIdV2();
		const pending = responder.waitForResponse(executionId, true);

		const additionalData = {} as IWorkflowExecuteAdditionalData;
		attachResponseHooks(additionalData, {
			context: {
				executionId,
				stepId: 'step-1',
				workflowId: 'wf-1',
				mode: 'production',
				iteration: 0,
				callerContext: { hostMode: 'webhook' },
			},
			respond: sender.emitterFor(executionId),
		} as unknown as StepExecutionRequest);

		return { additionalData, pending };
	};

	it('delivers the original bytes, headers and status code to the control plane', async () => {
		const { additionalData, pending } = buildPath();

		await additionalData.hooks?.runHook('sendResponse', [
			{ body: Buffer.from(bytes), headers, statusCode: 201 },
		]);

		const outcome = await pending.settled;
		expect(outcome).toEqual({
			status: 'response',
			response: { body: bytes, headers, statusCode: 201 },
		});
		const { response } = outcome as { response: { body: unknown } };
		expect(Buffer.isBuffer(response.body)).toBe(true);
	});

	it('delivers a JSON body as before', async () => {
		const { additionalData, pending } = buildPath();

		await additionalData.hooks?.runHook('sendResponse', [
			{ body: { ok: true }, headers: {}, statusCode: 200 },
		]);

		await expect(pending.settled).resolves.toEqual({
			status: 'response',
			response: { body: { ok: true }, headers: {}, statusCode: 200 },
		});
	});
});
