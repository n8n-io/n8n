import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IBinaryData, IExecuteResponsePromiseData, IRun, IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import type { EngineV2PayloadGuard } from '@/services/engine-v2-payload-guard.service';
import { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';

describe('EngineV2ActiveTriggers', () => {
	const dispatcher = mock<EngineV2Dispatcher>();
	const payloadGuard = mock<EngineV2PayloadGuard>();
	const workflowData = mock<IWorkflowBase>();

	let engineV2ActiveTriggers: EngineV2ActiveTriggers;

	beforeEach(() => {
		vi.clearAllMocks();
		payloadGuard.assertNoFiles.mockResolvedValue(undefined);
		payloadGuard.discardFiles.mockResolvedValue(undefined);
		engineV2ActiveTriggers = new EngineV2ActiveTriggers(dispatcher, payloadGuard);
	});

	describe('handles', () => {
		it.each([true, false])('answers what the dispatcher answers: %s', (routes) => {
			dispatcher.handlesWorkflow.mockReturnValue(routes);

			expect(engineV2ActiveTriggers.handles(workflowData, 'trigger')).toBe(routes);
			expect(dispatcher.handlesWorkflow).toHaveBeenCalledWith(workflowData, 'trigger');
		});
	});

	describe('assertSupported', () => {
		it('allows an emit that does not wait for its run', () => {
			expect(() => engineV2ActiveTriggers.assertSupported({})).not.toThrow();
		});

		it.each([
			{
				name: 'a response promise',
				emit: { responsePromise: mock<IDeferredPromise<IExecuteResponsePromiseData>>() },
			},
			{
				name: 'a done promise',
				emit: { donePromise: mock<IDeferredPromise<IRun | undefined>>() },
			},
			{
				name: 'both promises',
				emit: {
					responsePromise: mock<IDeferredPromise<IExecuteResponsePromiseData>>(),
					donePromise: mock<IDeferredPromise<IRun | undefined>>(),
				},
			},
		])('refuses an emit that carries $name', ({ emit }) => {
			expect(() => engineV2ActiveTriggers.assertSupported(emit)).toThrow(UserError);
			expect(() => engineV2ActiveTriggers.assertSupported(emit)).toThrow(
				'Engine 2.0 cannot run a trigger that waits for its execution to finish yet. Set the node to hand off without waiting.',
			);
		});
	});

	describe('assertPayloadSupported', () => {
		it('asks the guard to refuse files, naming the trigger surface', async () => {
			const slots = [[{ json: {}, binary: { data: mock<IBinaryData>() } }]];

			await engineV2ActiveTriggers.assertPayloadSupported(slots);

			expect(payloadGuard.assertNoFiles).toHaveBeenCalledWith(
				slots,
				'Engine 2.0 cannot receive files from a trigger yet.',
			);
		});

		it('surfaces the refusal the guard raises', async () => {
			payloadGuard.assertNoFiles.mockRejectedValue(new UserError('nope'));

			await expect(engineV2ActiveTriggers.assertPayloadSupported([[]])).rejects.toThrow('nope');
		});
	});

	describe('discardFiles', () => {
		it('hands the payload to the guard', async () => {
			const slots = [[{ json: {} }]];

			await engineV2ActiveTriggers.discardFiles(slots);

			expect(payloadGuard.discardFiles).toHaveBeenCalledWith(slots);
		});
	});

	describe('assertPollSupported', () => {
		it('always refuses', () => {
			expect(() => engineV2ActiveTriggers.assertPollSupported()).toThrow(UserError);
			expect(() => engineV2ActiveTriggers.assertPollSupported()).toThrow(
				'Engine 2.0 cannot run polling triggers yet.',
			);
		});
	});
});
