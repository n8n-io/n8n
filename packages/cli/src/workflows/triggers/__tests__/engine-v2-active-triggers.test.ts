import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteResponsePromiseData, IRun, IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import type { EngineV2PayloadFiles } from '@/services/engine-v2-payload-files.service';
import { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';

describe('EngineV2ActiveTriggers', () => {
	const dispatcher = mock<EngineV2Dispatcher>();
	const payloadFiles = mock<EngineV2PayloadFiles>();
	const workflowData = mock<IWorkflowBase>();
	const slots = [[{ json: {} }]];

	let engineV2ActiveTriggers: EngineV2ActiveTriggers;

	beforeEach(() => {
		vi.clearAllMocks();
		payloadFiles.discard.mockResolvedValue(undefined);
		engineV2ActiveTriggers = new EngineV2ActiveTriggers(dispatcher, payloadFiles);
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
			expect(() => engineV2ActiveTriggers.assertSupported({}, slots)).not.toThrow();
			expect(payloadFiles.discard).not.toHaveBeenCalled();
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
			expect(() => engineV2ActiveTriggers.assertSupported(emit, slots)).toThrow(UserError);
			expect(() => engineV2ActiveTriggers.assertSupported(emit, slots)).toThrow(
				'Engine v2 cannot run a trigger that waits for its execution to finish yet. Set the node to hand off without waiting.',
			);
			// The run does not start, so nothing else deletes the stored files.
			expect(payloadFiles.discard).toHaveBeenCalledWith(slots);
		});
	});
});
