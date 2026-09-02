import type { LifecycleEvent } from '@n8n/engine';
import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';
import { EngineLifecycleEventController } from '../engine-lifecycle-event.controller';

const events: LifecycleEvent[] = [
	{
		type: 'execution:started',
		executionId: 'exec-1',
		workflowId: 'wf-1',
		mode: 'manual',
		at: '2026-08-24T10:00:00.000Z',
	},
	{
		type: 'step:completed',
		executionId: 'exec-1',
		stepId: 'step-1',
		nodeId: 'node-a',
		nodeName: 'Edit Fields',
		iteration: 0,
		outputs: [[{ json: { greeting: 'hi' } }]],
		at: '2026-08-24T10:00:01.000Z',
	},
];

describe('EngineLifecycleEventController', () => {
	let pushRelay: EngineLifecycleEventPushRelay;
	let controller: EngineLifecycleEventController;

	const newResponse = () => {
		const res = {
			status: vi.fn(),
			end: vi.fn(),
			json: vi.fn(),
			header: vi.fn(),
		};
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown = { events }) => ({ body }) as unknown as Request;

	beforeEach(() => {
		pushRelay = mock<EngineLifecycleEventPushRelay>();
		controller = new EngineLifecycleEventController(pushRelay);
	});

	describe('receiveLifecycleEvents', () => {
		it('answers 204', async () => {
			const res = newResponse();

			await controller.receiveLifecycleEvents(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(204);
			expect(res.end).toHaveBeenCalled();
		});

		it('hands the whole batch to the push relay, in order', async () => {
			await controller.receiveLifecycleEvents(newRequest(), newResponse());

			expect(pushRelay.relay).toHaveBeenCalledExactlyOnceWith(events);
		});

		it.each([
			['a batch the engine schema rejects', { events: [{ type: 'nope' }] }],
			['an empty batch', { events: [] }],
			['a body that is not a batch at all', { hello: 'world' }],
		])('rejects %s without a reason', async (_label, body) => {
			const res = newResponse();

			await expect(controller.receiveLifecycleEvents(newRequest(body), res)).rejects.toThrow(
				BadRequestError,
			);
			expect(res.status).not.toHaveBeenCalled();
			// Unvalidated input must never reach the relay.
			expect(pushRelay.relay).not.toHaveBeenCalled();
		});
	});
});
