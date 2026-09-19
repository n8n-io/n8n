import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import type { ExecutionResponse, ExecutionResponseChannel } from '@n8n/engine';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { createExecutionIdV2 } from '@/executions/execution-id';
import { EXECUTION_ENDED_WITHOUT_RESPONSE } from '@/webhooks/constants';
import {
	EngineV2WebhookResponder,
	MAX_PENDING_WEBHOOKS,
} from '@/services/engine-v2-webhook-responder.service';

const TIMEOUT_MS = 50_000;

/**
 * Stands in for the channel. Only `src/modules/engine-v2/**` may import
 * `@n8n/engine` at runtime, and the channel's own suite covers the frame round
 * trip; what matters here is what the responder does with a response.
 *
 * Subscriptions are per execution, as the real channel's are, so a publish for
 * another run reaches nobody.
 */
function fakeChannel() {
	const handlers = new Map<string, Array<(response: ExecutionResponse) => void>>();

	return {
		channel: {
			subscribe: (executionId: string, handler: (r: ExecutionResponse) => void) => {
				const forExecution = handlers.get(executionId) ?? [];
				handlers.set(executionId, [...forExecution, handler]);

				return () => handlers.delete(executionId);
			},
		} as unknown as ExecutionResponseChannel,
		publish: (response: ExecutionResponse) =>
			handlers.get(response.executionId)?.forEach((h) => h(response)),
	};
}

const endedResponse = (executionId: string, overrides: Record<string, unknown> = {}) => ({
	type: 'ended' as const,
	executionId,
	workflowId: 'wf-1',
	status: 'completed' as const,
	lastStep: {
		nodeId: 'a',
		nodeName: 'A',
		status: 'completed' as const,
		outputs: [[{ json: { a: 1 } }]],
	},
	...overrides,
});

const newResponder = (timeoutMs = TIMEOUT_MS) =>
	new EngineV2WebhookResponder(
		mock<EngineConfig>({ webhookResponseTimeout: timeoutMs }),
		mock<Logger>({ scoped: () => mock<Logger>() }),
	);

describe('EngineV2WebhookResponder', () => {
	let channel: { publish: (response: ExecutionResponse) => void };
	let responder: EngineV2WebhookResponder;

	beforeEach(() => {
		const fake = fakeChannel();
		channel = fake;
		responder = newResponder();
		responder.useChannel(fake.channel);
	});

	it('listens under the id the run is started with', () => {
		const executionId = createExecutionIdV2();

		expect(responder.waitForResponse(executionId).executionId).toBe(executionId);
	});

	it('refuses to listen before the host hands over a channel', () => {
		expect(() => newResponder().waitForResponse(createExecutionIdV2())).toThrow(
			'without a channel',
		);
	});

	it('refuses a run once it listens for as many as it can hold', () => {
		for (let i = 0; i < MAX_PENDING_WEBHOOKS; i++) {
			responder.waitForResponse(createExecutionIdV2());
		}

		// Refused before dispatch, so no run starts that nothing can answer.
		expect(() => responder.waitForResponse(createExecutionIdV2())).toThrow('Try again later');
	});

	it('listens again once an answered run releases its slot', () => {
		const pending = Array.from({ length: MAX_PENDING_WEBHOOKS }, () =>
			responder.waitForResponse(createExecutionIdV2()),
		);

		pending[0].release();

		expect(() => responder.waitForResponse(createExecutionIdV2())).not.toThrow();
	});

	it('leaves an unrelated pending run unaffected', async () => {
		const other = responder.waitForResponse(createExecutionIdV2());
		const pending = responder.waitForResponse(createExecutionIdV2());

		channel.publish(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toMatchObject({ status: 'completed' });

		const stillPending = Symbol('still pending');
		await expect(Promise.race([other.settled, Promise.resolve(stillPending)])).resolves.toBe(
			stillPending,
		);
	});

	it('reports the step the run ended with', async () => {
		const pending = responder.waitForResponse(createExecutionIdV2());

		channel.publish(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('reports no last node when that step produced nothing', async () => {
		const pending = responder.waitForResponse(createExecutionIdV2());

		channel.publish(
			endedResponse(pending.executionId, {
				lastStep: { nodeId: 'c', nodeName: 'C', status: 'skipped', outputs: null },
			}),
		);

		await expect(pending.settled).resolves.toEqual({ status: 'completed', lastNode: undefined });
	});

	it('resolves the response promise when the Respond node answers', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = responder.waitForResponse(createExecutionIdV2(), responsePromise);

		channel.publish({
			type: 'response',
			executionId: pending.executionId,
			payload: { body: { ok: true }, headers: {}, statusCode: 200 },
		});

		await expect(responsePromise.promise).resolves.toMatchObject({ body: { ok: true } });
	});

	it('rejects the response promise when the response fails', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = responder.waitForResponse(createExecutionIdV2(), responsePromise);

		channel.publish({
			type: 'failure',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(responsePromise.promise).rejects.toThrow('The response is too large.');
	});

	it('stands the response promise down when the Respond node never ran', async () => {
		const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
		const pending = responder.waitForResponse(createExecutionIdV2(), responsePromise);

		channel.publish(endedResponse(pending.executionId));

		await expect(responsePromise.promise).resolves.toBe(EXECUTION_ENDED_WITHOUT_RESPONSE);
	});

	it('reports a failure with the node that caused it', async () => {
		const pending = responder.waitForResponse(createExecutionIdV2());

		channel.publish(
			endedResponse(pending.executionId, {
				status: 'failed',
				lastStep: {
					nodeId: 'c',
					nodeName: 'C',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);

		await expect(pending.settled).resolves.toEqual({
			status: 'failed',
			nodeName: 'C',
			error: { name: 'NodeOperationError', message: 'it broke' },
		});
	});

	it('reports a response failure without attributing it to a node', async () => {
		const pending = responder.waitForResponse(createExecutionIdV2());

		channel.publish({
			type: 'failure',
			executionId: pending.executionId,
			error: { code: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});

		await expect(pending.settled).resolves.toEqual({
			status: 'failed',
			error: { name: 'RESPONSE_TOO_LARGE', message: 'The response is too large.' },
		});
	});

	it('times out rather than waiting forever for a lost answer', async () => {
		const impatient = newResponder(1);
		impatient.useChannel(fakeChannel().channel);

		await expect(impatient.waitForResponse(createExecutionIdV2()).settled).resolves.toEqual({
			status: 'timeout',
		});
	});

	it('drops later responses for a released run', async () => {
		const pending = responder.waitForResponse(createExecutionIdV2());
		pending.release();

		channel.publish(endedResponse(pending.executionId));

		await expect(Promise.race([pending.settled, Promise.resolve('still waiting')])).resolves.toBe(
			'still waiting',
		);
	});
});
