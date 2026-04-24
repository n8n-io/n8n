import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { ref, computed, nextTick, type Ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { useEventRelay } from '../useEventRelay';
import type { WorkflowExecutionState } from '../useExecutionPushEvents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function executionStartedEvent(executionId: string, workflowId: string): PushMessage {
	return {
		type: 'executionStarted',
		data: {
			executionId,
			workflowId,
			mode: 'integrated' as const,
			startedAt: new Date(),
			flattedRunData: '[]',
		},
	} as PushMessage;
}

function nodeExecuteBeforeEvent(executionId: string, nodeName: string): PushMessage {
	return {
		type: 'nodeExecuteBefore',
		data: { executionId, nodeName, data: {} },
	} as PushMessage;
}

function nodeExecuteAfterEvent(executionId: string, nodeName: string): PushMessage {
	return {
		type: 'nodeExecuteAfter',
		data: { executionId, nodeName, data: {}, itemCountByConnectionType: {} },
	} as PushMessage;
}

function createExecState(
	workflowId: string,
	executionId: string,
	status: 'running' | 'success' | 'error',
	eventLog: PushMessage[] = [],
): WorkflowExecutionState {
	return { workflowId, executionId, status, eventLog };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useEventRelay', () => {
	let relay: Mock;
	let clearEventLog: Mock;
	let workflowExecutions: Ref<Map<string, WorkflowExecutionState>>;
	let activeWorkflowId: Ref<string | null>;
	let bufferedEventsStore: Map<string, PushMessage[]>;

	function setup(overrides?: { activeWfId?: string | null }) {
		relay = vi.fn();
		clearEventLog = vi.fn();
		workflowExecutions = ref(new Map<string, WorkflowExecutionState>());
		activeWorkflowId = ref(overrides?.activeWfId ?? null);
		bufferedEventsStore = new Map<string, PushMessage[]>();

		return useEventRelay({
			workflowExecutions,
			activeWorkflowId: computed(() => activeWorkflowId.value),
			getBufferedEvents: (wfId: string) => bufferedEventsStore.get(wfId) ?? [],
			clearEventLog,
			relay,
		});
	}

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('handleIframeReady', () => {
		test('replays buffered events for the active workflow', async () => {
			const { handleIframeReady } = setup({ activeWfId: 'wf-1' });

			const events = [
				executionStartedEvent('exec-1', 'wf-1'),
				nodeExecuteBeforeEvent('exec-1', 'Node1'),
			];
			bufferedEventsStore.set('wf-1', events);

			handleIframeReady();
			await nextTick();

			expect(relay).toHaveBeenCalledTimes(2);
			expect(relay).toHaveBeenNthCalledWith(1, events[0]);
			expect(relay).toHaveBeenNthCalledWith(2, events[1]);
		});

		test('does nothing when no active workflow', async () => {
			const { handleIframeReady } = setup({ activeWfId: null });

			handleIframeReady();
			await nextTick();

			expect(relay).not.toHaveBeenCalled();
		});

		test('does nothing when no buffered events', async () => {
			const { handleIframeReady } = setup({ activeWfId: 'wf-1' });

			handleIframeReady();
			await nextTick();

			expect(relay).not.toHaveBeenCalled();
		});
	});

	describe('live event forwarding', () => {
		test('forwards latest event when execution is running', async () => {
			setup({ activeWfId: 'wf-1' });

			const nodeEvent = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [nodeEvent])],
			]);
			await nextTick();

			expect(relay).toHaveBeenCalledTimes(1);
			expect(relay).toHaveBeenCalledWith(nodeEvent);
		});

		test('relays executionFinished when execution appears already finished', async () => {
			setup({ activeWfId: 'wf-1' });

			// Vue may coalesce ref updates so the watcher fires for the first time
			// with the execution already finished (prev status is undefined).
			// The relay should still send executionFinished.
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'success', [])],
			]);
			await nextTick();

			expect(relay).toHaveBeenCalledTimes(1);
			expect(relay.mock.calls[0][0].type).toBe('executionFinished');
		});

		test('does not forward when active workflow does not match', async () => {
			setup({ activeWfId: 'wf-2' });

			const nodeEvent = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [nodeEvent])],
			]);
			await nextTick();

			expect(relay).not.toHaveBeenCalled();
		});

		test('does not forward when no active workflow', async () => {
			setup({ activeWfId: null });

			const nodeEvent = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [nodeEvent])],
			]);
			await nextTick();

			expect(relay).not.toHaveBeenCalled();
		});

		test('forwards each new event as it arrives', async () => {
			setup({ activeWfId: 'wf-1' });

			const event1 = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [event1])],
			]);
			await nextTick();

			const event2 = nodeExecuteAfterEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [event1, event2])],
			]);
			await nextTick();

			expect(relay).toHaveBeenCalledTimes(2);
			expect(relay).toHaveBeenNthCalledWith(1, event1);
			expect(relay).toHaveBeenNthCalledWith(2, event2);
		});

		test('relays executionFinished on running → success transition', async () => {
			setup({ activeWfId: 'wf-1' });

			// Start running
			const nodeEvent = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [nodeEvent])],
			]);
			await nextTick();
			expect(relay).toHaveBeenCalledTimes(1);

			// Transition to success (eventLog cleared, as useExecutionPushEvents does)
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'success', [])],
			]);
			await nextTick();

			expect(relay).toHaveBeenCalledTimes(2);
			const finishEvent = relay.mock.calls[1][0];
			expect(finishEvent.type).toBe('executionFinished');
			expect(finishEvent.data.executionId).toBe('exec-1');
			expect(finishEvent.data.status).toBe('success');
		});

		test('relays executionFinished on running → error transition', async () => {
			setup({ activeWfId: 'wf-1' });

			workflowExecutions.value = new Map([
				[
					'wf-1',
					createExecState('wf-1', 'exec-1', 'running', [nodeExecuteBeforeEvent('exec-1', 'N1')]),
				],
			]);
			await nextTick();

			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'error', [])],
			]);
			await nextTick();

			const finishEvent = relay.mock.calls[1][0];
			expect(finishEvent.type).toBe('executionFinished');
			expect(finishEvent.data.status).toBe('error');
		});

		test('calls clearEventLog on running → finished transition', async () => {
			setup({ activeWfId: 'wf-1' });

			workflowExecutions.value = new Map([
				[
					'wf-1',
					createExecState('wf-1', 'exec-1', 'running', [nodeExecuteBeforeEvent('exec-1', 'N1')]),
				],
			]);
			await nextTick();
			expect(clearEventLog).not.toHaveBeenCalled();

			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'success', [])],
			]);
			await nextTick();

			expect(clearEventLog).toHaveBeenCalledWith('wf-1');
		});

		test('relays coalesced events that arrived between watcher fires', async () => {
			setup({ activeWfId: 'wf-1' });

			// Simulate multiple events arriving in a single batch (Vue may coalesce ref updates)
			const event1 = nodeExecuteBeforeEvent('exec-1', 'Node1');
			const event2 = nodeExecuteAfterEvent('exec-1', 'Node1');
			const event3 = nodeExecuteBeforeEvent('exec-1', 'Node2');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [event1, event2, event3])],
			]);
			await nextTick();

			// All three events should be relayed, not just the last one
			expect(relay).toHaveBeenCalledTimes(3);
			expect(relay).toHaveBeenNthCalledWith(1, event1);
			expect(relay).toHaveBeenNthCalledWith(2, event2);
			expect(relay).toHaveBeenNthCalledWith(3, event3);
		});

		test('does not double-relay events after handleIframeReady', async () => {
			const { handleIframeReady } = setup({ activeWfId: 'wf-1' });

			const event1 = nodeExecuteBeforeEvent('exec-1', 'Node1');
			const event2 = nodeExecuteAfterEvent('exec-1', 'Node1');
			bufferedEventsStore.set('wf-1', [event1, event2]);

			// handleIframeReady replays buffer and sets relayedCount
			handleIframeReady();
			await nextTick();
			expect(relay).toHaveBeenCalledTimes(2);

			// Now watcher fires with the same events — should not re-relay
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [event1, event2])],
			]);
			await nextTick();

			// Still just 2 calls — watcher did not double-relay
			expect(relay).toHaveBeenCalledTimes(2);
		});

		test('relays pending events before sending executionFinished on transition', async () => {
			setup({ activeWfId: 'wf-1' });

			const nodeEvent = nodeExecuteBeforeEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'running', [nodeEvent])],
			]);
			await nextTick();

			// Transition to success with pending events still in the log
			const lateEvent = nodeExecuteAfterEvent('exec-1', 'Node1');
			workflowExecutions.value = new Map([
				['wf-1', createExecState('wf-1', 'exec-1', 'success', [nodeEvent, lateEvent])],
			]);
			await nextTick();

			// Should relay: nodeEvent (already done), lateEvent, then executionFinished
			expect(relay).toHaveBeenCalledTimes(3);
			expect(relay).toHaveBeenNthCalledWith(2, lateEvent);
			expect(relay.mock.calls[2][0].type).toBe('executionFinished');
		});
	});
});
