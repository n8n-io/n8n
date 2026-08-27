import type { Logger } from '@n8n/backend-common';
import type { LifecycleEvent } from '@n8n/engine';
import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
	// The controller scopes its logger, so assert on the scoped one.
	let logger: Logger;
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
		logger = mock<Logger>();
		controller = new EngineLifecycleEventController(
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
		);
	});

	describe('receiveLifecycleEvents', () => {
		it('answers 204', async () => {
			const res = newResponse();

			await controller.receiveLifecycleEvents(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(204);
			expect(res.end).toHaveBeenCalled();
		});

		it('logs every event in the batch, not just a count', async () => {
			await controller.receiveLifecycleEvents(newRequest(), newResponse());

			expect(logger.debug).toHaveBeenCalledTimes(2);
			expect(logger.debug).toHaveBeenNthCalledWith(
				1,
				'Engine lifecycle event: execution:started',
				events[0],
			);
		});

		it('logs a completed step by its output slot count, never its contents', async () => {
			// A log must not become a copy of a user's execution data.
			await controller.receiveLifecycleEvents(newRequest(), newResponse());

			const [message, metadata] = vi.mocked(logger.debug).mock.calls[1];

			expect(message).toBe('Engine lifecycle event: step:completed');
			expect(metadata).toEqual({
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				nodeId: 'node-a',
				nodeName: 'Edit Fields',
				iteration: 0,
				at: '2026-08-24T10:00:01.000Z',
				outputSlots: 1,
			});
			expect(JSON.stringify(metadata)).not.toContain('greeting');
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
		});
	});
});
