import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { InstanceAiMessage } from '@n8n/api-types';
import {
	mockPushConnectionStore,
	createInstanceAiHarness,
	executionStartedEvent,
	executionFinishedEvent,
	nodeExecuteBeforeEvent,
	nodeExecuteAfterEvent,
	type InstanceAiHarness,
} from './createInstanceAiHarness';

// Must be called before any import that uses usePushConnectionStore
mockPushConnectionStore();

describe('composable integration', () => {
	let h: InstanceAiHarness;

	beforeEach(async () => {
		vi.restoreAllMocks();
		h = await createInstanceAiHarness();
	});

	// -----------------------------------------------------------------------
	// 1. Execution status flows through to tab icons
	// -----------------------------------------------------------------------
	describe('execution status end-to-end', () => {
		test('push event flows through to tab executionStatus', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();

			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
		});

		test('status transitions from running to success', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');

			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');
		});

		test('status transitions from running to error', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'error'));
			await h.flush();

			expect(h.allArtifactTabs.value[0].executionStatus).toBe('error');
		});
	});

	// -----------------------------------------------------------------------
	// 2. Tab auto-switches to executed workflow
	// -----------------------------------------------------------------------
	describe('tab auto-switch on execution', () => {
		test('switches to latest artifact when execution completes on different workflow', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');
			h.selectTab('wf-2');
			h.setStreaming(true);

			h.addBuildResult('wf-1');
			await h.flush();
			h.addExecutionResult('wf-1', 'exec-1');
			await h.flush();

			// Should switch to the workflow that was just built and executed
			expect(h.activeTabId.value).toBe('wf-1');
		});

		test('auto-opens preview when streaming and build result appears', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			expect(h.isPreviewVisible.value).toBe(false);

			h.addBuildResult('wf-1');
			await h.flush();

			expect(h.isPreviewVisible.value).toBe(true);
			expect(h.activeWorkflowId.value).toBe('wf-1');
		});
	});

	// -----------------------------------------------------------------------
	// 3. Re-execution clears stale state
	// -----------------------------------------------------------------------
	describe('re-execution clears stale state', () => {
		test('clears activeExecutionId when new execution starts', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.setStreaming(true);

			// First execution completes
			h.addBuildResult('wf-1');
			await h.flush();
			h.addExecutionResult('wf-1', 'exec-1');
			await h.flush();
			expect(h.activeExecutionId.value).toBe('exec-1');

			// Second execution starts via push
			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));
			await h.flush();

			expect(h.activeExecutionId.value).toBeNull();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
		});

		test('re-execution relays events to iframe when execution results are already showing', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			// Build workflow
			h.addBuildResult('wf-1', 'tc-build-1');
			await h.flush();
			expect(h.activeWorkflowId.value).toBe('wf-1');

			// First execution completes via push events
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Start'));
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Start'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();

			// Execution result added to messages — sets activeExecutionId (iframe shows results)
			h.addExecutionResult('wf-1', 'exec-1');
			await h.flush();
			expect(h.activeExecutionId.value).toBe('exec-1');

			// Re-execute — iframe must switch to running state
			h.relayedEvents.length = 0;
			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));
			await h.flush();

			// Iframe should leave execution results view
			expect(h.activeExecutionId.value).toBeNull();
			// Tab should show running
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
			// executionStarted must be relayed so iframe shows running state
			expect(h.relayedEvents.length).toBeGreaterThan(0);
			expect(h.relayedEvents.some((e) => e.type === 'executionStarted')).toBe(true);

			// Subsequent node events must also be relayed
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-2', 'Start'));
			await h.flush();
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('nodeExecuteBefore');
		});
	});

	// -----------------------------------------------------------------------
	// 4. Iframe late-loading replays buffered events
	// -----------------------------------------------------------------------
	describe('iframe late-loading replay', () => {
		test('replays buffered events when iframe loads after execution started', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');

			// Execution starts and node events arrive before iframe is ready
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Node1'));
			await h.flush();

			// No events relayed yet (iframe not ready)
			// Note: live watcher may have forwarded some events, clear to isolate replay
			const preReplayCount = h.relayedEvents.length;

			// Iframe loads
			await h.simulateIframeReady();

			// Buffered events replayed
			const replayed = h.relayedEvents.slice(preReplayCount);
			expect(replayed.length).toBeGreaterThanOrEqual(3);
			expect(replayed[0].type).toBe('executionStarted');
			expect(replayed[1].type).toBe('nodeExecuteBefore');
			expect(replayed[2].type).toBe('nodeExecuteAfter');
		});

		test('does not replay when no active workflow', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();

			const countBefore = h.relayedEvents.length;
			await h.simulateIframeReady();

			expect(h.relayedEvents.length).toBe(countBefore);
		});
	});

	// -----------------------------------------------------------------------
	// 5. Historical execution restored on tab switch
	// -----------------------------------------------------------------------
	describe('historical execution restoration', () => {
		test('restores execution from chat history when switching tabs', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');

			// Simulate historical data (page refresh scenario)
			h.addMessageWithExecution('wf-1', 'exec-1', 'success');
			await h.flush();

			h.selectTab('wf-1');
			await h.flush();

			expect(h.activeExecutionId.value).toBe('exec-1');
		});

		test('does not override live execution with historical data', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');

			// Live execution is running
			h.simulatePushEvent(executionStartedEvent('exec-live', 'wf-1'));
			await h.flush();

			// Historical message also exists
			h.addMessageWithExecution('wf-1', 'exec-old', 'success');
			await h.flush();

			h.selectTab('wf-1');
			await h.flush();

			// Live execution should not be overridden
			expect(h.activeExecutionId.value).toBeNull(); // cleared by running status watcher
		});
	});

	// -----------------------------------------------------------------------
	// 6. Tab switch clears execution for tabs without execution
	// -----------------------------------------------------------------------
	describe('tab switch clears execution', () => {
		test('clears activeExecutionId when switching to tab without execution', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');

			// wf-1 has historical execution
			h.addMessageWithExecution('wf-1', 'exec-1', 'success');
			await h.flush();

			h.selectTab('wf-1');
			await h.flush();
			expect(h.activeExecutionId.value).toBe('exec-1');

			// Switch to wf-2 which has no execution
			h.selectTab('wf-2');
			await h.flush();

			expect(h.activeExecutionId.value).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// 7. Thread switch clears all state
	// -----------------------------------------------------------------------
	describe('thread switch', () => {
		test('resets all preview and execution state', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.markUserSentMessage();
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();

			await h.switchThread('thread-2');

			expect(h.activeTabId.value).toBeNull();
			expect(h.activeWorkflowId.value).toBeNull();
			expect(h.activeExecutionId.value).toBeNull();
			expect(h.isPreviewVisible.value).toBe(false);
			expect(h.userSentMessage.value).toBe(false);
			// Execution status should be cleared even though tabs remain in registry
			const wfTab = h.allArtifactTabs.value.find((t) => t.id === 'wf-1');
			expect(wfTab?.executionStatus).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// 8. Live events forwarded in real-time
	// -----------------------------------------------------------------------
	describe('live event forwarding', () => {
		test('forwards events as they arrive during running execution', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0; // clear any prior events

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();

			const countAfterStart = h.relayedEvents.length;

			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();

			expect(h.relayedEvents.length).toBeGreaterThan(countAfterStart);
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('nodeExecuteBefore');
		});

		test('stops forwarding after execution finishes', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();

			const countAfterFinish = h.relayedEvents.length;

			// No more events should be forwarded
			await h.flush();
			expect(h.relayedEvents.length).toBe(countAfterFinish);
		});
	});

	// -----------------------------------------------------------------------
	// Multi-step scenarios
	// -----------------------------------------------------------------------
	describe('multi-step scenarios', () => {
		/** Snapshot relay count, return events added since snapshot */
		function relayedSince(snapshot: number) {
			return h.relayedEvents.slice(snapshot);
		}

		test('running → error → switch to workflow without execution', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// wf-1 starts running — events relayed to iframe (active tab matches)
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('running');
			expect(h.activeExecutionId.value).toBeNull();
			const afterStart = h.relayedEvents.length;
			expect(afterStart).toBeGreaterThan(0);

			// Node event relayed
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(afterStart);

			// wf-1 fails — executionFinished is relayed so iframe clears executing nodes
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'error'));
			await h.flush();
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('error');
			// Switch to wf-2 (no execution) — no relay
			const beforeSwitch = h.relayedEvents.length;
			h.selectTab('wf-2');
			await h.flush();
			expect(h.activeExecutionId.value).toBeNull();
			expect(h.relayedEvents.length).toBe(beforeSwitch); // nothing relayed for wf-2

			// wf-1 still shows error in its tab
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('error');
		});

		test('success → re-execute → running → success (full cycle)', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// First execution: events relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(0);

			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');
			const afterFirstExec = h.relayedEvents.length;

			// Re-execution starts — new events relayed
			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
			expect(h.relayedEvents.length).toBeGreaterThan(afterFirstExec);

			// Re-execution succeeds — executionFinished relayed, then relay stops
			const beforeSecondFinish = h.relayedEvents.length;
			h.simulatePushEvent(executionFinishedEvent('exec-2', 'wf-1', 'success'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');
			expect(h.relayedEvents.length).toBe(beforeSecondFinish + 1);
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('executionFinished');
		});

		test('two workflows executing concurrently — only active workflow events relayed', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// Both start running — only wf-1 events reach the relay
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(0);
			// All relayed events belong to wf-1's execution
			expect(
				h.relayedEvents.every((e) => 'executionId' in e.data && e.data.executionId === 'exec-1'),
			).toBe(true);

			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-2'));
			await h.flush();
			// No wf-2 events relayed — all still belong to exec-1
			expect(
				h.relayedEvents.every((e) => 'executionId' in e.data && e.data.executionId === 'exec-1'),
			).toBe(true);

			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('running');
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-2')?.executionStatus).toBe('running');

			// wf-1 finishes
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			const afterWf1Finish = h.relayedEvents.length;

			// wf-2 fails — not relayed (wf-1 is active tab, wf-2 isn't)
			h.simulatePushEvent(executionFinishedEvent('exec-2', 'wf-2', 'error'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(afterWf1Finish);
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-2')?.executionStatus).toBe('error');
		});

		test('switch tabs during execution — relay follows active tab', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// wf-1 starts running — relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(0);

			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();
			const beforeSwitch = h.relayedEvents.length;

			// Switch to wf-2 while wf-1 is still running
			h.selectTab('wf-2');
			await h.flush();

			// More wf-1 events arrive — NOT relayed (wf-2 is now active)
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Node1'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(beforeSwitch);

			// wf-1 completes while viewing wf-2 — not relayed
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(beforeSwitch);

			// Switch back to wf-1 — status visible
			h.selectTab('wf-1');
			await h.flush();
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('success');
		});

		test('historical exec → live re-execution overrides and relays', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.relayedEvents.length = 0;

			// Load historical — no relay (no push events)
			h.addMessageWithExecution('wf-1', 'exec-old', 'success');
			await h.flush();
			expect(h.relayedEvents.length).toBe(0);

			h.selectTab('wf-1');
			await h.flush();
			expect(h.activeExecutionId.value).toBe('exec-old');
			expect(h.relayedEvents.length).toBe(0); // historical, no push relay

			// Live execution starts — relayed
			h.simulatePushEvent(executionStartedEvent('exec-new', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
			expect(h.activeExecutionId.value).toBeNull();
			expect(h.relayedEvents.length).toBeGreaterThan(0);
		});

		test('execution on inactive workflow — no relay until tab switch + iframe ready', async () => {
			h.registerWorkflow('wf-1', 'Workflow A');
			h.registerWorkflow('wf-2', 'Workflow B');
			h.selectTab('wf-2');
			h.relayedEvents.length = 0;

			// wf-1 executes while viewing wf-2 — NOT relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(0);

			// Tab shows success
			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('success');

			// Switch to wf-1 — iframe ready replays buffered (but buffer was cleared on finish)
			h.selectTab('wf-1');
			await h.flush();
			await h.simulateIframeReady();
			// Buffer is cleared after finish, so no replay
			expect(h.relayedEvents.length).toBe(0);
		});

		test('thread switch during running execution stops relay', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// Execution running — relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();
			const beforeThreadSwitch = h.relayedEvents.length;
			expect(beforeThreadSwitch).toBeGreaterThan(0);

			// Switch thread mid-execution — clears everything
			await h.switchThread('thread-2');
			expect(h.activeTabId.value).toBeNull();

			// No more relay after thread switch
			expect(h.relayedEvents.length).toBe(beforeThreadSwitch);
		});

		test('workflow + data table interleaved — no relay for data table tab', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.registerDataTable('dt-1', 'My Table', 'proj-1');
			h.selectTab('dt-1');
			h.relayedEvents.length = 0;

			// Workflow executes while viewing data table — NOT relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.activeTabId.value).toBe('dt-1');
			expect(h.relayedEvents.length).toBe(0);

			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(0);

			// Workflow finishes — still no relay
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(0);

			expect(h.allArtifactTabs.value.find((t) => t.id === 'wf-1')?.executionStatus).toBe('success');

			// Switch to workflow tab — iframe ready can replay (buffer cleared on finish though)
			h.selectTab('wf-1');
			await h.flush();
			await h.simulateIframeReady();
			expect(h.relayedEvents.length).toBe(0); // buffer cleared after finish
		});

		test('rapid re-execution: relay tracks latest execution only', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// First execution starts — relayed
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			const afterFirst = h.relayedEvents.length;
			expect(afterFirst).toBeGreaterThan(0);

			// Second execution starts before first finishes — relayed (overwrites)
			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(afterFirst);

			// First execution finishes (stale — ignored by tracking)
			const beforeStaleFinish = h.relayedEvents.length;
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			// Stale finish is ignored, exec-2 is still running
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');

			// Node event for exec-2 still relayed
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-2', 'Node1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(beforeStaleFinish);

			// Second execution finishes — executionFinished relayed, then relay stops
			const beforeSecondFinish = h.relayedEvents.length;
			h.simulatePushEvent(executionFinishedEvent('exec-2', 'wf-1', 'error'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('error');
			expect(h.relayedEvents.length).toBe(beforeSecondFinish + 1);
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('executionFinished');
		});

		test('relay: buffered replay then live forwarding in sequence', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.selectTab('wf-1');
			h.relayedEvents.length = 0;

			// Events arrive before iframe — live watcher may forward some
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Node1'));
			await h.flush();

			const preReplayCount = h.relayedEvents.length;

			// Iframe ready — replays ALL buffered events
			await h.simulateIframeReady();
			const afterReplayCount = h.relayedEvents.length;
			expect(afterReplayCount).toBeGreaterThan(preReplayCount);

			// Verify replay contains the full sequence
			const replayed = relayedSince(preReplayCount);
			expect(replayed[0].type).toBe('executionStarted');
			expect(replayed[1].type).toBe('nodeExecuteBefore');

			// More live events arrive after replay — still forwarded
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Node1'));
			await h.flush();
			expect(h.relayedEvents.length).toBeGreaterThan(afterReplayCount);
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('nodeExecuteAfter');

			// Execution finishes — executionFinished relayed, then relay stops
			const beforeFinish = h.relayedEvents.length;
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.relayedEvents.length).toBe(beforeFinish + 1);
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('executionFinished');
		});
	});

	// -----------------------------------------------------------------------
	// 9. Build → execute → edit: no stale node state
	// -----------------------------------------------------------------------
	describe('build → execute → edit workflow', () => {
		test('editing after execution clears execution state and stops relay', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			// Step 1: Build
			h.addBuildResult('wf-1', 'tc-build-1');
			await h.flush();
			expect(h.activeWorkflowId.value).toBe('wf-1');

			// Step 2: Execute — push events relay node highlighting
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');

			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Start'));
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Start'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Set'));
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Set'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();

			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');
			const relayCountAfterExecution = h.relayedEvents.length;

			// Step 3: Edit — new build result for the same workflow
			h.addBuildResult('wf-1', 'tc-build-2');
			await h.flush();

			// Execution state should be cleared
			expect(h.activeExecutionId.value).toBeNull();
			// Preview should still be open on the same workflow
			expect(h.activeWorkflowId.value).toBe('wf-1');
			// No new events should be relayed after the edit
			expect(h.relayedEvents.length).toBe(relayCountAfterExecution);
		});

		test('node events from old execution are not relayed after edit', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			// Build and start execution
			h.addBuildResult('wf-1', 'tc-build-1');
			await h.flush();

			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Start'));
			await h.flush();
			const relayCountDuringExecution = h.relayedEvents.length;
			expect(relayCountDuringExecution).toBeGreaterThan(0);

			// Execution finishes
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Start'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			const relayCountAfterFinish = h.relayedEvents.length;

			// Edit — new build
			h.addBuildResult('wf-1', 'tc-build-2');
			await h.flush();

			// Simulate a late-arriving node event from the old execution
			// (e.g. race condition where event arrives after build)
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'LateNode'));
			await h.flush();

			// Should NOT be relayed — old execution is done and workflow was rebuilt
			expect(h.relayedEvents.length).toBe(relayCountAfterFinish);
		});

		test('new execution after edit is tracked independently', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			// Build → execute → finish
			h.addBuildResult('wf-1', 'tc-build-1');
			await h.flush();
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');

			// Edit
			h.addBuildResult('wf-1', 'tc-build-2');
			await h.flush();
			expect(h.activeExecutionId.value).toBeNull();

			// New execution on edited workflow
			h.relayedEvents.length = 0;
			h.simulatePushEvent(executionStartedEvent('exec-2', 'wf-1'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('running');
			expect(h.relayedEvents.length).toBeGreaterThan(0);

			// Node events for new execution should relay
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-2', 'Start'));
			await h.flush();
			expect(h.relayedEvents[h.relayedEvents.length - 1].type).toBe('nodeExecuteBefore');

			// Finish new execution
			h.simulatePushEvent(executionFinishedEvent('exec-2', 'wf-1', 'success'));
			await h.flush();
			expect(h.allArtifactTabs.value[0].executionStatus).toBe('success');
		});

		test('iframe replay after edit does not include old execution events', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.setStreaming(true);

			// Build → execute with node events → finish
			h.addBuildResult('wf-1', 'tc-build-1');
			await h.flush();
			h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-1'));
			h.simulatePushEvent(nodeExecuteBeforeEvent('exec-1', 'Start'));
			h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Start'));
			h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-1', 'success'));
			await h.flush();

			// Edit
			h.addBuildResult('wf-1', 'tc-build-2');
			await h.flush();

			// Iframe reloads after edit — should NOT replay old execution events
			h.relayedEvents.length = 0;
			await h.simulateIframeReady();

			// No old events should be replayed (buffer was cleared on finish)
			expect(h.relayedEvents.length).toBe(0);
		});
	});

	// -----------------------------------------------------------------------
	// Data table lifecycle
	// -----------------------------------------------------------------------
	describe('data table lifecycle', () => {
		test('auto-opens data table preview when streaming', async () => {
			h.registerDataTable('dt-1', 'Users Table', 'proj-1');
			h.setStreaming(true);

			h.addMessage({
				id: 'msg-dt',
				role: 'assistant',
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: new Date().toISOString(),
				agentTree: {
					agentId: 'agent-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'tc-dt',
							toolName: 'data-tables',
							args: { action: 'create' },
							isLoading: false,
							result: { table: { id: 'dt-1', name: 'Users Table' } },
						},
					],
					children: [],
					timeline: [],
				},
			} as InstanceAiMessage);
			await h.flush();

			expect(h.activeDataTableId.value).toBe('dt-1');
			expect(h.activeWorkflowId.value).toBeNull();
		});

		test('falls back to first tab when active data table is deleted', async () => {
			h.registerWorkflow('wf-1', 'My Workflow');
			h.registerDataTable('dt-1', 'Users Table', 'proj-1');
			h.selectTab('dt-1');
			await h.flush();

			expect(h.activeDataTableId.value).toBe('dt-1');

			// Simulate deletion via message
			h.addMessage({
				id: 'msg-del',
				role: 'assistant',
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: new Date().toISOString(),
				agentTree: {
					agentId: 'agent-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'tc-del',
							toolName: 'data-tables',
							args: { action: 'delete', dataTableId: 'dt-1' },
							isLoading: false,
							result: { success: true },
						},
					],
					children: [],
					timeline: [],
				},
			} as InstanceAiMessage);
			await h.flush();

			expect(h.activeTabId.value).toBe('wf-1');
			expect(h.activeWorkflowId.value).toBe('wf-1');
		});
	});
});
