import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { PushMessage } from '@n8n/api-types';
import { useExecutionPushEvents } from '../useExecutionPushEvents';

// ---------------------------------------------------------------------------
// Mock push connection store
// ---------------------------------------------------------------------------

let capturedHandler: ((event: PushMessage) => void) | null = null;
const mockRemoveListener = vi.fn();

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn(() => ({
		addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
			capturedHandler = handler;
			return mockRemoveListener;
		}),
	})),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulatePushEvent(event: PushMessage) {
	if (!capturedHandler) throw new Error('No push handler registered');
	capturedHandler(event);
}

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

function executionFinishedEvent(
	executionId: string,
	workflowId: string,
	status: 'success' | 'error' | 'crashed',
): PushMessage {
	return {
		type: 'executionFinished',
		data: { executionId, workflowId, status },
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExecutionPushEvents', () => {
	beforeEach(() => {
		capturedHandler = null;
		mockRemoveListener.mockClear();
	});

	test('registers a push event listener on creation', () => {
		useExecutionPushEvents();
		expect(capturedHandler).not.toBeNull();
	});

	describe('executionStarted', () => {
		test('creates entry with running status', () => {
			const { getStatus } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));

			expect(getStatus('wf-1')).toBe('running');
		});

		test('overwrites previous execution for same workflow (latest only)', () => {
			const { getStatus, getBufferedEvents } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));

			expect(getStatus('wf-1')).toBe('running');
			// Buffer should be reset for the new execution
			expect(getBufferedEvents('wf-1')).toHaveLength(1); // only executionStarted for exec-2
		});
	});

	describe('executionFinished', () => {
		test('sets success status', () => {
			const { getStatus } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));

			expect(getStatus('wf-1')).toBe('success');
		});

		test('sets error status for error', () => {
			const { getStatus } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'error'));

			expect(getStatus('wf-1')).toBe('error');
		});

		test('sets error status for crashed', () => {
			const { getStatus } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'crashed'));

			expect(getStatus('wf-1')).toBe('error');
		});

		test('clears eventLog on finish', () => {
			const { getBufferedEvents } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));

			expect(getBufferedEvents('wf-1')).toHaveLength(0);
		});
	});

	describe('event buffering', () => {
		test('buffers executionStarted event', () => {
			const { getBufferedEvents } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));

			expect(getBufferedEvents('wf-1')).toHaveLength(1);
			expect(getBufferedEvents('wf-1')[0].type).toBe('executionStarted');
		});

		test('buffers nodeExecuteBefore and nodeExecuteAfter events', () => {
			const { getBufferedEvents } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Node1'));

			expect(getBufferedEvents('wf-1')).toHaveLength(3);
		});

		test('returns empty array for unknown workflow', () => {
			const { getBufferedEvents } = useExecutionPushEvents();

			expect(getBufferedEvents('unknown-wf')).toEqual([]);
		});
	});

	describe('node events mapped via executionId', () => {
		test('maps nodeExecuteBefore to correct workflow via executionId', () => {
			const { getBufferedEvents } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(executionStartedEvent('exec-2', 'wf-2'));
			simulatePushEvent(nodeExecuteBeforeEvent('exec-2', 'Node1'));

			// Node event should be in wf-2's buffer, not wf-1's
			expect(getBufferedEvents('wf-1')).toHaveLength(1); // only executionStarted
			expect(getBufferedEvents('wf-2')).toHaveLength(2); // executionStarted + nodeExecuteBefore
		});
	});

	describe('clearAll', () => {
		test('wipes all execution state', () => {
			const { getStatus, getBufferedEvents, clearAll } = useExecutionPushEvents();

			simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			simulatePushEvent(executionStartedEvent('exec-2', 'wf-2'));

			clearAll();

			expect(getStatus('wf-1')).toBeUndefined();
			expect(getStatus('wf-2')).toBeUndefined();
			expect(getBufferedEvents('wf-1')).toEqual([]);
			expect(getBufferedEvents('wf-2')).toEqual([]);
		});
	});

	describe('cleanup', () => {
		test('removes push event listener', () => {
			const { cleanup } = useExecutionPushEvents();

			cleanup();

			expect(mockRemoveListener).toHaveBeenCalledOnce();
		});
	});

	describe('ignores unrelated events', () => {
		test('does not track non-execution push events', () => {
			const { getStatus } = useExecutionPushEvents();

			simulatePushEvent({
				type: 'workflowActivated',
				data: { workflowId: 'wf-1' },
			} as PushMessage);

			expect(getStatus('wf-1')).toBeUndefined();
		});
	});

	describe('getStatus', () => {
		test('returns undefined for untracked workflow', () => {
			const { getStatus } = useExecutionPushEvents();
			expect(getStatus('wf-unknown')).toBeUndefined();
		});
	});
});
