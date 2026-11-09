import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, reactive } from 'vue';

import { createArtifactPreviewMemory } from '../artifactPreviewMemory';
import { provideArtifactThread, useArtifactThread, type ArtifactThread } from '../artifactThread';
import { useInstanceAiWorkflowPreviewExecution } from '../composables/useInstanceAiWorkflowPreviewExecution';
import { useIsAgentWorking } from '../composables/useIsAgentWorking';
import { provideThread, type ThreadRuntime } from '../instanceAi.store';

const { pushListeners } = vi.hoisted(() => ({
	pushListeners: [] as Array<(event: unknown) => void>,
}));
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener: vi.fn((listener: (event: unknown) => void) => {
			pushListeners.push(listener);
			return vi.fn();
		}),
	}),
}));

function createArtifactThread(overrides: Partial<ArtifactThread> = {}): ArtifactThread {
	return reactive({
		id: 'thread-1',
		projectId: 'project-1',
		messages: [],
		producedArtifacts: new Map(),
		resourceNameIndex: new Map(),
		pendingWorkflowAttachment: null,
		hydrationStatus: 'ready',
		isHydratingThread: false,
		isStreaming: false,
		isSendingMessage: false,
		currentTasks: null,
		consumePendingHandoff: () => undefined,
		sendMessage: async () => true,
		...createArtifactPreviewMemory(),
		...overrides,
	});
}

/** Mounts `setup` below a parent that runs `provide`, and returns what `setup` returned. */
function runInChild<T>(provide: () => void, setup: () => T): T {
	let result: T | undefined;
	const Child = defineComponent({
		setup() {
			result = setup();
			return () => h('div');
		},
	});
	const Parent = defineComponent({
		setup() {
			provide();
			return () => h(Child);
		},
	});
	mount(Parent);
	if (result === undefined) throw new Error('The child did not run its setup');
	return result;
}

describe('useArtifactThread', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		pushListeners.length = 0;
	});

	it('returns the provided artifact thread', () => {
		const thread = createArtifactThread();

		expect(
			runInChild(
				() => provideArtifactThread(thread),
				() => useArtifactThread(),
			),
		).toBe(thread);
	});

	it('falls back to the thread runtime', () => {
		const runtime = createArtifactThread() as unknown as ThreadRuntime;

		expect(
			runInChild(
				() => provideThread(runtime),
				() => useArtifactThread(),
			),
		).toBe(runtime);
	});

	it.each([
		['streams', { isStreaming: true }, true],
		['loads its history', { isHydratingThread: true }, true],
		['is idle', {}, false],
	])('locks the previews when the provided thread %s: %s', (_name, overrides, expected) => {
		const thread = createArtifactThread(overrides);

		const isAgentWorking = runInChild(
			() => provideArtifactThread(thread),
			() => useIsAgentWorking(),
		);

		expect(isAgentWorking.value).toBe(expected);
	});

	it('runs the workflow preview execution with only a provided artifact thread', () => {
		const thread = createArtifactThread();
		const getRemembered = vi.spyOn(thread, 'getRememberedManualExecution');

		const execution = runInChild(
			() => provideArtifactThread(thread),
			() =>
				useInstanceAiWorkflowPreviewExecution({
					workflowId: () => 'wf-1',
					executionResult: () => undefined,
					reportWorkflowFailures: vi.fn(),
					paneElement: () => null,
				}),
		);
		execution.restoreExecutionResult();

		expect(getRemembered).toHaveBeenCalledWith('wf-1');
	});

	it('reports the finished runs of the previewed workflow by their status', () => {
		const reportWorkflowFailures = vi.fn();
		const reportWorkflowSuccess = vi.fn();
		runInChild(
			() => provideArtifactThread(createArtifactThread()),
			() =>
				useInstanceAiWorkflowPreviewExecution({
					workflowId: () => 'wf-1',
					executionResult: () => undefined,
					reportWorkflowFailures,
					reportWorkflowSuccess,
					paneElement: () => null,
				}),
		);
		const finish = (data: Record<string, unknown>) => {
			for (const listener of pushListeners) listener({ type: 'executionFinished', data });
		};

		finish({ workflowId: 'wf-1', executionId: 'exec-1', status: 'error' });
		finish({ workflowId: 'wf-2', executionId: 'exec-2', status: 'success' });
		finish({ workflowId: 'wf-1', executionId: 'exec-3', status: 'success' });

		expect(reportWorkflowFailures).toHaveBeenCalledExactlyOnceWith('exec-1', 'wf-1');
		expect(reportWorkflowSuccess).toHaveBeenCalledExactlyOnceWith('wf-1');
	});
});
