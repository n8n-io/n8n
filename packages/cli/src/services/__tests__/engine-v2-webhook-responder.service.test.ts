import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import type { ExecutionResponse, ExecutionResponseChannel } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { EngineV2WebhookResponder } from '@/services/engine-v2-webhook-responder.service';

const TIMEOUT_MS = 50_000;

/**
 * Stands in for the channel. Only `src/modules/engine-v2/**` may import
 * `@n8n/engine` at runtime, and the channel's own suite covers the frame round
 * trip; what matters here is what the responder does with a response.
 */
function fakeChannel() {
	const handlers: Array<(response: ExecutionResponse) => void> = [];
	return {
		channel: {
			subscribe: (h: (r: ExecutionResponse) => void) => handlers.push(h),
		} as unknown as ExecutionResponseChannel,
		publish: (response: ExecutionResponse) => handlers.forEach((h) => h(response)),
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

describe('EngineV2WebhookResponder', () => {
	let channel: { publish: (response: ExecutionResponse) => void };
	let responder: EngineV2WebhookResponder;

	beforeEach(() => {
		const fake = fakeChannel();
		channel = fake;
		responder = new EngineV2WebhookResponder(
			mock<EngineConfig>({ webhookResponseTimeout: TIMEOUT_MS }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);
		responder.subscribeTo(fake.channel);
	});

	it('mints an execution id the run can be started with', () => {
		expect(responder.expect().executionId).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('drops a response for a run another replica holds', () => {
		expect(() => channel.publish(endedResponse('not-ours'))).not.toThrow();
	});

	it('reports the step the run ended with', async () => {
		const pending = responder.expect();

		channel.publish(endedResponse(pending.executionId));

		await expect(pending.settled).resolves.toEqual({
			status: 'completed',
			lastNode: { nodeName: 'A', outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('reports no last node when that step produced nothing', async () => {
		const pending = responder.expect();

		channel.publish(
			endedResponse(pending.executionId, {
				lastStep: { nodeId: 'c', nodeName: 'C', status: 'skipped', outputs: null },
			}),
		);

		await expect(pending.settled).resolves.toEqual({ status: 'completed', lastNode: undefined });
	});

	it('reports a failure', async () => {
		const pending = responder.expect();

		channel.publish(endedResponse(pending.executionId, { status: 'failed' }));

		await expect(pending.settled).resolves.toEqual({ status: 'failed' });
	});

	it('times out rather than waiting forever for a lost answer', async () => {
		const impatient = new EngineV2WebhookResponder(
			mock<EngineConfig>({ webhookResponseTimeout: 1 }),
			mock<Logger>({ scoped: () => mock<Logger>() }),
		);

		await expect(impatient.expect().settled).resolves.toEqual({ status: 'timeout' });
	});

	it('drops later responses for a released run', async () => {
		const pending = responder.expect();
		pending.release();

		channel.publish(endedResponse(pending.executionId));

		await expect(Promise.race([pending.settled, Promise.resolve('still waiting')])).resolves.toBe(
			'still waiting',
		);
	});
});
