import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
	mockPushConnectionStore,
	createInstanceAiHarness,
	executionStartedEvent,
	executionFinishedEvent,
	nodeExecuteAfterEvent,
	type InstanceAiHarness,
} from './createInstanceAiHarness';

// Must run before any module imports usePushConnectionStore.
mockPushConnectionStore();

describe('build-phase events survive tab activation', () => {
	let h: InstanceAiHarness;

	beforeEach(async () => {
		vi.restoreAllMocks();
		h = await createInstanceAiHarness();
	});

	test('relays buffered events when the user opens the tab after the run finished', async () => {
		// Two workflow tabs exist; the user is parked on a different one when
		// the build agent runs the workflow we care about.
		h.registerWorkflow('wf-other', 'Other');
		h.registerWorkflow('wf-target', 'Target');
		h.selectTab('wf-other');
		await h.simulateIframeReady();

		// Build agent kicks off and finishes a verification run on wf-target
		// while the active tab is still wf-other. None of these should reach
		// the iframe yet — they buffer in workflowExecutions[wf-target].
		h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-target'));
		h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Trigger'));
		h.simulatePushEvent(nodeExecuteAfterEvent('exec-1', 'Set'));
		h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-target', 'success'));
		await h.flush();

		// Nothing relayed for wf-target yet (it wasn't active).
		expect(h.relayedEvents).toHaveLength(0);

		// User switches to the target tab — but events must NOT replay yet,
		// because openWorkflow hasn't been sent to the iframe yet.
		h.selectTab('wf-target');
		await h.flush();
		expect(h.relayedEvents).toHaveLength(0);

		// Once the new workflow has been loaded into the iframe (via
		// `workflow-loaded` from InstanceAiWorkflowPreview), buffered events
		// replay so the canvas reflects the run.
		await h.simulateWorkflowLoaded('wf-target');

		const relayedTypes = h.relayedEvents.map((e) => e.type);
		expect(relayedTypes).toEqual([
			'executionStarted',
			'nodeExecuteAfter',
			'nodeExecuteAfter',
			'executionFinished',
		]);
	});

	test('does not double-relay if the user opens, leaves, and returns to the tab', async () => {
		h.registerWorkflow('wf-other', 'Other');
		h.registerWorkflow('wf-target', 'Target');
		h.selectTab('wf-other');
		await h.simulateIframeReady();

		h.simulatePushEvent(executionStartedEvent('exec-1', 'wf-target'));
		h.simulatePushEvent(executionFinishedEvent('exec-1', 'wf-target', 'success'));
		await h.flush();

		h.selectTab('wf-target');
		await h.simulateWorkflowLoaded('wf-target');
		const firstReplayCount = h.relayedEvents.length;
		expect(firstReplayCount).toBeGreaterThan(0);

		// Switch away and back — nothing new arrived, so the replay cursor
		// should prevent re-sending the same events.
		h.selectTab('wf-other');
		await h.simulateWorkflowLoaded('wf-other');
		h.selectTab('wf-target');
		await h.simulateWorkflowLoaded('wf-target');

		expect(h.relayedEvents).toHaveLength(firstReplayCount);
	});
});
