import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { render } from '@testing-library/vue';
import fc from 'fast-check';
import type { PushMessage } from '@n8n/api-types';
import { changedWorkflowId, useAutomationUpdates } from '../useAutomationUpdates';

const { pushHandlers, pushStore } = vi.hoisted(() => {
	const handlers = new Set<(event: PushMessage) => void>();
	return {
		pushHandlers: handlers,
		pushStore: {
			pushConnect: vi.fn(),
			pushDisconnect: vi.fn(),
			addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
				handlers.add(handler);
				return () => handlers.delete(handler);
			}),
		},
	};
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => pushStore,
}));

const activated = (workflowId: string): PushMessage => ({
	type: 'workflowActivated',
	data: { workflowId, activeVersionId: 'v1' },
});

const updated = (workflowId: string): PushMessage => ({
	type: 'workflowUpdated',
	data: { workflowId, userId: 'user-1' },
});

function emit(event: PushMessage) {
	for (const handler of [...pushHandlers]) handler(event);
}

function showTab() {
	document.dispatchEvent(new Event('visibilitychange'));
}

function mountUpdates({ enabled = true, workflowIds = ['wf-1', 'wf-2'] } = {}) {
	const isEnabled = ref(enabled);
	const ids = ref(workflowIds);
	const onChange = vi.fn();
	const host = defineComponent({
		setup() {
			useAutomationUpdates(isEnabled, ids, onChange);
			return () => null;
		},
	});
	return { ...render(host), isEnabled, ids, onChange };
}

const WORKFLOW_CHANGE_TYPES = [
	'workflowActivated',
	'workflowPartiallyActivated',
	'workflowDeactivated',
	'workflowAutoDeactivated',
	'workflowUpdated',
];

/** Push messages of the workflow change types, other types with a workflow ID, and unknown types. */
const pushMessageArb = fc.record({
	type: fc.oneof(
		fc.constantFrom(
			...WORKFLOW_CHANGE_TYPES,
			'workflowFailedToActivate',
			'workflowSettingsUpdated',
			'executionStarted',
			'agentExecutionUpdated',
		),
		fc.string(),
	),
	data: fc.record({ workflowId: fc.string() }),
});

describe('changedWorkflowId', () => {
	it('returns the workflow ID of exactly the workflow change types', () => {
		fc.assert(
			fc.property(pushMessageArb, (message) => {
				const expected = WORKFLOW_CHANGE_TYPES.includes(message.type)
					? message.data.workflowId
					: undefined;

				expect(changedWorkflowId(message as PushMessage)).toBe(expected);
			}),
		);
	});

	it.each<[string, PushMessage]>([
		['workflowActivated', activated('wf-1')],
		[
			'workflowPartiallyActivated',
			{
				type: 'workflowPartiallyActivated',
				data: { workflowId: 'wf-1', activeVersionId: 'v1', errorMessage: 'x', failedNodes: [] },
			},
		],
		['workflowDeactivated', { type: 'workflowDeactivated', data: { workflowId: 'wf-1' } }],
		['workflowAutoDeactivated', { type: 'workflowAutoDeactivated', data: { workflowId: 'wf-1' } }],
		['workflowUpdated', updated('wf-1')],
	])('returns the workflow of %s', (_, event) => {
		expect(changedWorkflowId(event)).toBe('wf-1');
	});

	it.each<[string, PushMessage]>([
		[
			'a failed activation, which leaves the workflow off',
			{ type: 'workflowFailedToActivate', data: { workflowId: 'wf-1', errorMessage: 'x' } },
		],
		[
			'a settings change',
			{ type: 'workflowSettingsUpdated', data: { workflowId: 'wf-1', settings: {} } },
		],
		['a workflow execution', { type: 'executionRecovered', data: { executionId: 'e1' } }],
	])('returns nothing for %s', (_, event) => {
		expect(changedWorkflowId(event)).toBeUndefined();
	});
});

describe('useAutomationUpdates', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		pushHandlers.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls back once, one second after a listed workflow changes', async () => {
		const { onChange } = mountUpdates();

		emit(activated('wf-1'));
		await vi.advanceTimersByTimeAsync(999);
		expect(onChange).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(onChange).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(5000);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('calls back once for a run of saves', async () => {
		const { onChange } = mountUpdates();

		for (let save = 0; save < 5; save++) {
			emit(updated(save % 2 === 0 ? 'wf-1' : 'wf-2'));
			await vi.advanceTimersByTimeAsync(300);
		}
		await vi.advanceTimersByTimeAsync(5000);

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('ignores workflows that are not in the list, and follows the list when it changes', async () => {
		const { onChange, ids } = mountUpdates();

		emit(activated('wf-9'));
		await vi.advanceTimersByTimeAsync(5000);
		expect(onChange).not.toHaveBeenCalled();

		ids.value = ['wf-9'];
		emit(activated('wf-9'));
		await vi.advanceTimersByTimeAsync(1000);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('calls back when the tab becomes visible', () => {
		const { onChange } = mountUpdates();

		showTab();

		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('does nothing while disabled, and starts when enabled', async () => {
		const { onChange, isEnabled } = mountUpdates({ enabled: false });

		emit(activated('wf-1'));
		showTab();
		await vi.advanceTimersByTimeAsync(5000);
		expect(onChange).not.toHaveBeenCalled();
		expect(pushStore.addEventListener).not.toHaveBeenCalled();

		isEnabled.value = true;
		await nextTick();
		emit(activated('wf-1'));
		await vi.advanceTimersByTimeAsync(1000);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('stops listening on unmount, also for a change that came before', async () => {
		const { onChange, unmount } = mountUpdates();

		emit(activated('wf-1'));
		unmount();
		showTab();
		await vi.advanceTimersByTimeAsync(5000);

		expect(onChange).not.toHaveBeenCalled();
		expect(pushHandlers.size).toBe(0);
		expect(pushStore.pushDisconnect).toHaveBeenCalledTimes(1);
	});
});
