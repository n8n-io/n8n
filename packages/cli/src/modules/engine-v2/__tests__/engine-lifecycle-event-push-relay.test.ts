import type { Logger } from '@n8n/backend-common';
import type { LifecycleEvent } from '@n8n/engine';
import type { PushMessage } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';

import { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';

const EXECUTION_ID = 'exec-1';
const PUSH_REF = 'push-1';
const WORKFLOW_ID = 'wf-1';
const TRIGGER_NAME = 'When clicking Execute';

const stepFields = {
	executionId: EXECUTION_ID,
	stepId: 'step-1',
	nodeId: 'node-a',
	nodeName: 'Edit Fields',
	iteration: 0,
};

const executionStarted: LifecycleEvent = {
	type: 'execution:started',
	executionId: EXECUTION_ID,
	workflowId: WORKFLOW_ID,
	mode: 'manual',
	at: '2026-08-25T10:00:00.000Z',
};

const stepStarted: LifecycleEvent = {
	...stepFields,
	type: 'step:started',
	at: '2026-08-25T10:00:01.000Z',
};

const stepCompleted: LifecycleEvent = {
	...stepFields,
	type: 'step:completed',
	outputs: [[{ json: { greeting: 'hi' } }]],
	at: '2026-08-25T10:00:01.500Z',
};

const stepFailed: LifecycleEvent = {
	...stepFields,
	type: 'step:failed',
	at: '2026-08-25T10:00:01.500Z',
};

describe('EngineLifecycleEventPushRelay', () => {
	let push: Push;
	let logger: Logger;
	let registry: EngineV2PushRegistry;
	let relay: EngineLifecycleEventPushRelay;

	/** Sent push messages, in order. */
	const sent = () => vi.mocked(push.send).mock.calls.map(([message]) => message);

	const sentOfType = <T extends PushMessage['type']>(type: T) =>
		sent().filter((message): message is Extract<PushMessage, { type: T }> => message.type === type);

	const register = (overrides: { trigger?: { nodeName: string; outputs: never } } = {}) =>
		registry.register(EXECUTION_ID, {
			pushRef: PUSH_REF,
			workflowId: WORKFLOW_ID,
			...overrides,
		});

	beforeEach(() => {
		push = mock<Push>();
		logger = mock<Logger>();
		registry = new EngineV2PushRegistry();
		relay = new EngineLifecycleEventPushRelay(
			registry,
			push,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
		);
	});

	it('sends nothing for an execution it has no session for', () => {
		relay.relay([executionStarted, stepStarted, stepCompleted]);

		expect(push.send).not.toHaveBeenCalled();
	});

	it('routes every message to the session that started the run', () => {
		register();

		relay.relay([stepStarted, stepCompleted]);

		for (const [, pushRef] of vi.mocked(push.send).mock.calls) {
			expect(pushRef).toBe(PUSH_REF);
		}
	});

	it('never sends executionStarted', () => {
		// Would overwrite the editor's existing run data with an empty scaffold.
		register();

		relay.relay([executionStarted, stepStarted, stepCompleted]);

		expect(sentOfType('executionStarted')).toHaveLength(0);
	});

	describe('the trigger', () => {
		const triggerOutputs = [[{ json: { first: true } }]];

		const registerWithTrigger = () =>
			registry.register(EXECUTION_ID, {
				pushRef: PUSH_REF,
				workflowId: WORKFLOW_ID,
				trigger: { nodeName: TRIGGER_NAME, outputs: triggerOutputs },
			});

		it('reports its run, because the engine never announces it', () => {
			registerWithTrigger();

			relay.relay([executionStarted]);

			expect(sent().map((message) => message.type)).toEqual([
				'nodeExecuteBefore',
				'nodeExecuteAfter',
				'nodeExecuteAfterData',
			]);
			const [before] = sentOfType('nodeExecuteBefore');
			expect(before.data.nodeName).toBe(TRIGGER_NAME);
			expect(before.data.data.executionIndex).toBe(0);
			expect(sentOfType('nodeExecuteAfterData')[0].data.data.data).toEqual({
				main: triggerOutputs,
			});
		});

		it('reports it only once, however often the update is redelivered', () => {
			registerWithTrigger();

			relay.relay([executionStarted, executionStarted]);

			expect(sentOfType('nodeExecuteBefore')).toHaveLength(1);
		});

		it('reports nothing when the run named no trigger', () => {
			register();

			relay.relay([executionStarted]);

			expect(push.send).not.toHaveBeenCalled();
		});
	});

	describe('step:started', () => {
		it('sends nodeExecuteBefore with the step start time', () => {
			register();

			relay.relay([stepStarted]);

			const [before] = sentOfType('nodeExecuteBefore');
			expect(before.data).toEqual({
				executionId: EXECUTION_ID,
				nodeName: 'Edit Fields',
				sequenceNumber: 0,
				data: {
					startTime: Date.parse(stepStarted.at),
					executionIndex: 0,
					source: [],
				},
			});
		});

		it('ignores a redelivered start', () => {
			register();

			relay.relay([stepStarted, stepStarted]);

			expect(sentOfType('nodeExecuteBefore')).toHaveLength(1);
		});
	});

	describe('step:completed', () => {
		it('sends nodeExecuteAfter without the data, then nodeExecuteAfterData with it', () => {
			register();

			relay.relay([stepStarted, stepCompleted]);

			const [after] = sentOfType('nodeExecuteAfter');
			expect(after.data.data).not.toHaveProperty('data');
			expect(after.data.data.executionStatus).toBe('success');
			expect(after.data.itemCountByConnectionType).toEqual({ main: [1] });

			const [afterData] = sentOfType('nodeExecuteAfterData');
			expect(afterData.data.data.data).toEqual({ main: [[{ json: { greeting: 'hi' } }]] });
		});

		it('sends the output data as a binary frame', () => {
			register();

			relay.relay([stepStarted, stepCompleted]);

			const call = vi
				.mocked(push.send)
				.mock.calls.find(([message]) => message.type === 'nodeExecuteAfterData');
			expect(call?.[2]).toBe(true);
		});

		it('reuses the executionIndex allocated at the start, so the two messages pair up', () => {
			register();

			relay.relay([stepStarted, stepCompleted]);

			const [before] = sentOfType('nodeExecuteBefore');
			const [after] = sentOfType('nodeExecuteAfter');
			const [afterData] = sentOfType('nodeExecuteAfterData');
			expect(after.data.data.executionIndex).toBe(before.data.data.executionIndex);
			expect(afterData.data.data.executionIndex).toBe(before.data.data.executionIndex);
		});

		it('reports the time between the two updates', () => {
			register();

			relay.relay([stepStarted, stepCompleted]);

			expect(sentOfType('nodeExecuteAfter')[0].data.data.executionTime).toBe(500);
		});

		it('turns a slot the step did not fire into an empty branch', () => {
			register();

			relay.relay([stepStarted, { ...stepCompleted, outputs: [[{ json: { a: 1 } }], null] }]);

			const [after] = sentOfType('nodeExecuteAfter');
			expect(after.data.itemCountByConnectionType).toEqual({ main: [1, 0] });
			expect(sentOfType('nodeExecuteAfterData')[0].data.data.data).toEqual({
				main: [[{ json: { a: 1 } }], []],
			});
		});

		it('still reports the outcome when the start was lost', () => {
			register();

			relay.relay([stepCompleted]);

			expect(sentOfType('nodeExecuteAfter')).toHaveLength(1);
			expect(sentOfType('nodeExecuteAfterData')).toHaveLength(1);
		});

		it('ignores a redelivered completion', () => {
			register();

			relay.relay([stepStarted, stepCompleted, stepCompleted]);

			expect(sentOfType('nodeExecuteAfter')).toHaveLength(1);
		});

		it('reports the outcome on redelivery when the first send failed', () => {
			register();
			vi.mocked(push.send).mockImplementationOnce(() => {
				throw new Error('socket gone');
			});

			relay.relay([stepCompleted, stepCompleted]);

			// The failed attempt sent nothing, so only the redelivery reported the run.
			expect(sentOfType('nodeExecuteAfterData')).toHaveLength(1);
			// The retry reuses the run, so the editor replaces it instead of appending.
			const indexes = sentOfType('nodeExecuteAfter').map((m) => m.data.data.executionIndex);
			expect(indexes).toEqual([0, 0]);
		});

		it('gives each step its own executionIndex and a rising sequenceNumber', () => {
			register();
			const second = { ...stepFields, stepId: 'step-2', nodeName: 'Edit Fields 2' };

			relay.relay([
				stepStarted,
				stepCompleted,
				{ ...second, type: 'step:started', at: '2026-08-25T10:00:02.000Z' },
				{ ...second, type: 'step:completed', outputs: [[]], at: '2026-08-25T10:00:03.000Z' },
			]);

			expect(sentOfType('nodeExecuteBefore').map((m) => m.data.data.executionIndex)).toEqual([
				0, 1,
			]);
			expect(
				[
					...sentOfType('nodeExecuteBefore').map((m) => m.data.sequenceNumber),
					...sentOfType('nodeExecuteAfter').map((m) => m.data.sequenceNumber),
				].sort(),
			).toEqual([0, 1, 2, 3]);
		});
	});

	describe('step:failed', () => {
		it('marks the node failed and sends no data message', () => {
			register();

			relay.relay([stepStarted, stepFailed]);

			const [after] = sentOfType('nodeExecuteAfter');
			expect(after.data.data.executionStatus).toBe('error');
			// The editor keys failure display on `error`, not the status.
			expect(after.data.data.error).toBeDefined();
			expect(after.data.itemCountByConnectionType).toEqual({});
			expect(sentOfType('nodeExecuteAfterData')).toHaveLength(0);
		});

		it('sends an error that survives the wire', () => {
			// A plain `Error` would serialize to `{}`.
			register();

			relay.relay([stepStarted, stepFailed]);

			const { error } = sentOfType('nodeExecuteAfter')[0].data.data;
			expect(JSON.stringify(error)).toContain('Node execution failed');
		});
	});

	describe('the end of an execution', () => {
		it.each([
			['execution:completed', 'success'],
			['execution:failed', 'error'],
		] as const)('maps %s to executionFinished %s', (type, status) => {
			register();

			relay.relay([
				{
					type,
					executionId: EXECUTION_ID,
					workflowId: WORKFLOW_ID,
					at: '2026-08-25T10:00:04.000Z',
				},
			]);

			expect(sentOfType('executionFinished')[0].data).toEqual({
				executionId: EXECUTION_ID,
				workflowId: WORKFLOW_ID,
				status,
			});
		});

		it('releases the session, so later updates are ignored', () => {
			register();

			relay.relay([
				{
					type: 'execution:completed',
					executionId: EXECUTION_ID,
					workflowId: WORKFLOW_ID,
					at: '2026-08-25T10:00:04.000Z',
				},
				stepStarted,
			]);

			expect(registry.get(EXECUTION_ID)).toBeUndefined();
			expect(sentOfType('nodeExecuteBefore')).toHaveLength(0);
		});
	});

	it('keeps two concurrent runs apart', () => {
		register();
		registry.register('exec-2', { pushRef: 'push-2', workflowId: 'wf-2' });

		relay.relay([stepStarted, { ...stepStarted, executionId: 'exec-2', stepId: 'other-step' }]);

		const refs = vi.mocked(push.send).mock.calls.map(([, pushRef]) => pushRef);
		expect(refs).toEqual([PUSH_REF, 'push-2']);
	});

	it('logs a failing update and relays the rest of the batch', () => {
		register();
		vi.mocked(push.send).mockImplementationOnce(() => {
			throw new Error('socket gone');
		});

		relay.relay([stepStarted, stepCompleted]);

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(sentOfType('nodeExecuteAfter')).toHaveLength(1);
	});
});
