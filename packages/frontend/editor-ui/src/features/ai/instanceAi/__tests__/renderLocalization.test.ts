/**
 * Render-localization regression test: mounts the real message-list path
 * (InstanceAiMessage → AgentActivityTree → AgentTimeline → markdown) on the
 * real thread runtime, dispatches live SSE events, and counts which components
 * actually re-render. The `updated` lifecycle only fires when a component's
 * own render effect re-ran — children that bail out on equal props don't.
 *
 * Pins two invariants:
 * 1. Settled messages stay completely quiet while another message streams —
 *    including on structural events (tool calls), which re-derive the resource
 *    registry; reconciling into the in-place reactive maps must produce zero
 *    writes (and zero notifications) when nothing actually changed.
 * 2. A real registry change (new artifact) still propagates to settled
 *    messages (their markdown re-decorates), so the reconcile must not mask
 *    genuine updates.
 */
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h, nextTick, shallowReactive, watch } from 'vue';
import { render } from '@testing-library/vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { createThreadRuntime, type ThreadRuntime } from '../instanceAi.threadRuntime';
import { provideThread } from '../instanceAi.store';
import { messageHasVisibleContent } from '../builderAgents';
import InstanceAiMessage from '../components/InstanceAiMessage.vue';

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({ track: vi.fn() }),
}));

vi.mock('@n8n/rest-api-client', () => ({
	ResponseError: class ResponseError extends Error {},
}));

vi.mock('../instanceAi.api', () => ({
	ensureThread: vi.fn(),
	postMessage: vi.fn(),
	postCancel: vi.fn(),
	postCancelTask: vi.fn(),
	postConfirmation: vi.fn(),
}));

vi.mock('../instanceAi.memory.api', () => ({
	fetchThreads: vi.fn().mockResolvedValue({ threads: [], total: 0, page: 1, hasMore: false }),
	fetchThreadMessages: vi
		.fn()
		.mockResolvedValue({ threadId: 'thread-1', messages: [], nextEventId: 0 }),
	fetchThreadStatus: vi
		.fn()
		.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] }),
	deleteThread: vi.fn(),
	renameThread: vi.fn(),
}));

const localStorageStub = {
	getItem: vi.fn(() => 'false'),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageStub);

let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
class MockEventSource {
	onopen: (() => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	readyState = 1;
	constructor(public url: string) {
		setTimeout(() => {
			capturedOnMessage = this.onmessage;
			this.onopen?.();
		}, 0);
	}
	addEventListener(): void {}
	close = vi.fn();
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 2;
}
vi.stubGlobal('EventSource', MockEventSource);

// --- render counting --------------------------------------------------------

const renderCounts = new Map<string, number>();

interface CountableInstance {
	$options: { name?: string; __name?: string };
	$props: {
		message?: { id?: string };
		agentNode?: { agentId?: string };
		toolCall?: { toolCallId?: string };
		entry?: { content?: string };
		content?: string;
	};
}

const countingMixin = {
	updated(this: CountableInstance) {
		const name = this.$options.name ?? this.$options.__name ?? 'anon';
		const id =
			this.$props?.message?.id ??
			this.$props?.agentNode?.agentId ??
			this.$props?.toolCall?.toolCallId ??
			(this.$props?.entry?.content ?? this.$props?.content)?.slice(0, 16) ??
			'';
		const key = id ? `${name}#${id}` : name;
		renderCounts.set(key, (renderCounts.get(key) ?? 0) + 1);
	},
};

/** Identifiers that belong to the SETTLED first message (group g1). */
const G1_MARKERS = ['run-1', 'root-1', 'I will build', 'Done — see'];

function keysTouchingG1(): string[] {
	return [...renderCounts.keys()].filter((key) =>
		G1_MARKERS.some((marker) => key.includes(marker)),
	);
}

// --- event helpers ----------------------------------------------------------

function dispatch(data: unknown): void {
	capturedOnMessage!({ data: JSON.stringify(data), lastEventId: '' } as unknown as MessageEvent);
}

const ev = {
	runStart: (runId: string, agentId: string, groupId: string) => ({
		type: 'run-start',
		runId,
		agentId,
		payload: { messageId: 'm', messageGroupId: groupId },
	}),
	textDelta: (runId: string, agentId: string, text: string) => ({
		type: 'text-delta',
		runId,
		agentId,
		payload: { text },
	}),
	toolCall: (runId: string, agentId: string, toolCallId: string, toolName: string) => ({
		type: 'tool-call',
		runId,
		agentId,
		payload: { toolCallId, toolName, args: {} },
	}),
	toolResult: (runId: string, agentId: string, toolCallId: string, result: unknown) => ({
		type: 'tool-result',
		runId,
		agentId,
		payload: { toolCallId, result },
	}),
	status: (runId: string, agentId: string, message: string) => ({
		type: 'status',
		runId,
		agentId,
		payload: { message },
	}),
	runFinish: (runId: string, agentId: string) => ({
		type: 'run-finish',
		runId,
		agentId,
		payload: { status: 'completed' },
	}),
};

describe('message render localization', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		const rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = { baseUrl: 'http://localhost:5678/api', pushRef: 'test-ref' };
		rootStore.instanceId = 'instance-1';
		const workflowsListStore = mockedStore(useWorkflowsListStore);
		workflowsListStore.getWorkflowById.mockReturnValue(
			undefined as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>,
		);
		capturedOnMessage = null;
		renderCounts.clear();
	});

	test('settled messages stay quiet while another message streams', async () => {
		let runtime!: ThreadRuntime;
		const Harness = defineComponent({
			name: 'Harness',
			setup() {
				runtime = createThreadRuntime('thread-1', {
					onTitleUpdated: vi.fn(),
					onRunFinish: vi.fn(),
				});
				provideThread(runtime);
				// Mirrors InstanceAiThreadView's displayedMessages wiring: a stable
				// array spliced in place only when membership changes.
				const displayed = shallowReactive<ThreadRuntime['messages']>([]);
				watch(
					() => runtime.messages.filter(messageHasVisibleContent),
					(next) => {
						const unchanged =
							next.length === displayed.length && next.every((msg, i) => msg === displayed[i]);
						if (!unchanged) displayed.splice(0, displayed.length, ...next);
					},
					{ immediate: true },
				);
				return () =>
					h(
						'div',
						displayed.map((m) => h(InstanceAiMessage, { key: m.id, message: m })),
					);
			},
		});

		render(Harness, { global: { mixins: [countingMixin], plugins: [createTestingPinia()] } });
		runtime.connectSSE();
		await vi.waitFor(() => expect(capturedOnMessage).not.toBeNull());

		// --- Settled message (group g1, root-1) with one produced artifact ---
		dispatch(ev.runStart('run-1', 'root-1', 'g1'));
		dispatch(ev.textDelta('run-1', 'root-1', 'I will build a workflow. '));
		dispatch(ev.toolCall('run-1', 'root-1', 'tc-1', 'build-workflow'));
		dispatch(
			ev.toolResult('run-1', 'root-1', 'tc-1', {
				workflowId: 'wf-1',
				workflowName: 'Invoice Pipeline',
			}),
		);
		dispatch(ev.textDelta('run-1', 'root-1', 'Done — see Invoice Pipeline.'));
		dispatch(ev.runFinish('run-1', 'root-1'));
		await nextTick();

		// --- Second message (group g2, root-2) starts streaming, with one
		//     already-settled tool-call step in its timeline ---
		dispatch(ev.runStart('run-2', 'root-2', 'g2'));
		dispatch(ev.textDelta('run-2', 'root-2', 'Starting follow-up work.'));
		dispatch(ev.toolCall('run-2', 'root-2', 'tc-2', 'search'));
		dispatch(ev.toolResult('run-2', 'root-2', 'tc-2', { found: true }));
		await nextTick();
		await nextTick();

		// ====== quiet window: events that must not touch the settled message ==
		renderCounts.clear();

		dispatch(ev.textDelta('run-2', 'root-2', ' token'));
		await nextTick();
		dispatch(ev.textDelta('run-2', 'root-2', ' token2'));
		await nextTick();
		dispatch(ev.status('run-2', 'root-2', 'Thinking...'));
		await nextTick();

		// The settled g1 message (its wrapper, activity tree, and markdown
		// blocks) must not have re-rendered at all.
		expect(keysTouchingG1()).toEqual([]);
		// The stable displayedMessages array keeps the list itself quiet too.
		expect(renderCounts.has('Harness')).toBe(false);
		// Streamed tokens must not re-render the streaming message's settled
		// tool-call steps either (text reads live in the leaf segment, and
		// ToolCallStep carries no dynamic slots that would defeat the bailout).
		expect([...renderCounts.keys()].filter((key) => key.startsWith('ToolCallStep'))).toEqual([]);
		// Sanity: the streaming message did render.
		expect(renderCounts.get('InstanceAiMessage#run-2')).toBeGreaterThan(0);

		// ====== a structural event re-renders the timeline, not settled steps ==
		renderCounts.clear();

		dispatch(ev.toolCall('run-2', 'root-2', 'tc-3', 'search'));
		await nextTick();

		// The new step appears (the timeline re-renders), but the existing
		// settled step bails out on equal props.
		expect(renderCounts.has('ToolCallStep#tc-2')).toBe(false);
		expect(keysTouchingG1()).toEqual([]);

		// ====== a REAL registry change must still propagate ===================
		renderCounts.clear();

		dispatch(ev.toolCall('run-2', 'root-2', 'tc-4', 'build-workflow'));
		dispatch(
			ev.toolResult('run-2', 'root-2', 'tc-4', {
				workflowId: 'wf-2',
				workflowName: 'Second Pipeline',
			}),
		);
		await nextTick();

		// The settled message's markdown re-decorates against the grown registry
		// — the reconcile must not mask genuine changes.
		expect(keysTouchingG1().some((key) => key.startsWith('InstanceAiMarkdown'))).toBe(true);

		expect(runtime.messages).toHaveLength(2);
	});
});
