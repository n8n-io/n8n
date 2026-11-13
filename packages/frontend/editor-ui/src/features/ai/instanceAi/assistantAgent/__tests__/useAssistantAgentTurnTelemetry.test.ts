import type { AgentSseEvent } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, nextTick, ref } from 'vue';

import { EMPTY_ASSISTANT_MENTION_COUNTS } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import {
	GENERATION_STALL_TIMEOUT_MS,
	useAssistantAgentTurnTelemetry,
	type AssistantAgentSentMessageContext,
} from '../useAssistantAgentTurnTelemetry';

const { telemetryTrack, now } = vi.hoisted(() => ({
	telemetryTrack: vi.fn(),
	now: { value: 0 },
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('../../instanceAi.responseTiming', () => ({
	instanceAiResponseNow: () => now.value,
}));

const RECEIVED = TELEMETRY_EVENT.INSTANCE_AI.USER_RECEIVED_AI_ASSISTANT_RESPONSE;
const STALLED = 'Builder generation stalled';

const context: AssistantAgentSentMessageContext = {
	isFirstMessage: true,
	mentionCounts: EMPTY_ASSISTANT_MENTION_COUNTS,
	attachmentCount: 2,
	selectedElementCount: 1,
};

const started: AgentSseEvent = {
	type: 'execution-started',
	executionId: 'exec-1',
	sessionId: 'thread-1',
};

function setup() {
	const isStreaming = ref(false);
	const hasOpenInteraction = ref(false);
	let telemetry!: ReturnType<typeof useAssistantAgentTurnTelemetry>;
	const wrapper = mount(
		defineComponent({
			setup() {
				telemetry = useAssistantAgentTurnTelemetry({
					threadId: 'thread-1',
					isStreaming: () => isStreaming.value,
					hasOpenInteraction: () => hasOpenInteraction.value,
				});
				return () => null;
			},
		}),
	);
	return { telemetry, isStreaming, hasOpenInteraction, wrapper };
}

/** Lets the render check of a settled response run. */
async function flushRender() {
	await vi.advanceTimersByTimeAsync(20);
}

function receivedCalls() {
	return telemetryTrack.mock.calls.filter(([event]) => event === RECEIVED);
}

function stalledCalls() {
	return telemetryTrack.mock.calls.filter(([event]) => event === STALLED);
}

describe('useAssistantAgentTurnTelemetry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createTestingPinia({ stubActions: false }));
		useRootStore().setInstanceId('instance-1');
		telemetryTrack.mockReset();
		now.value = 1_000;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('User received AI Assistant response', () => {
		it('reports a completed run with the latency from the send', async () => {
			const { telemetry, isStreaming } = setup();

			telemetry.trackSubmit(context);
			isStreaming.value = true;
			telemetry.handleStreamEvent(started);
			telemetry.handleStreamEvent({ type: 'text-delta', id: 't1', delta: 'Hi' });
			now.value = 4_500;
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'stop' });
			await flushRender();

			expect(telemetryTrack).toHaveBeenCalledWith(RECEIVED, {
				instance_id: 'instance-1',
				thread_id: 'thread-1',
				run_id: 'exec-1',
				latency_ms: 3_500,
				is_first_user_message: true,
				response_kind: 'completed',
				action_source: 'unknown',
				tab_visible: expect.any(Boolean),
				mention_counts: EMPTY_ASSISTANT_MENTION_COUNTS,
				attachment_count: 2,
				selected_element_count: 1,
				runtime: 'agents',
			});
		});

		it('reports a run that shows a card as awaiting input, once', async () => {
			const { telemetry } = setup();

			telemetry.trackSubmit(context);
			telemetry.handleStreamEvent(started);
			telemetry.handleStreamEvent({
				type: 'tool-call-suspended',
				payload: { toolCallId: 'tc-1', runId: 'run-1', toolName: 'ask_user', input: {} },
			});
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'paused' });
			telemetry.handleStreamEvent({ type: 'done', executionId: 'exec-1' });
			await flushRender();

			expect(receivedCalls()).toHaveLength(1);
			expect(receivedCalls()[0][1]).toMatchObject({ response_kind: 'awaiting_input' });
		});

		it.each(['cancelled', 'error', 'guardrail'])(
			'does not report a run that finishes as %s',
			async (finishReason) => {
				const { telemetry } = setup();

				telemetry.trackSubmit(context);
				telemetry.handleStreamEvent(started);
				telemetry.handleStreamEvent({ type: 'finish', finishReason });
				await flushRender();

				expect(receivedCalls()).toHaveLength(0);
			},
		);

		it('does not report a run that ends with an error event', async () => {
			const { telemetry } = setup();

			telemetry.trackSubmit(context);
			telemetry.handleStreamEvent(started);
			telemetry.handleStreamEvent({ type: 'error', message: 'boom' });
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'stop' });
			await flushRender();

			expect(receivedCalls()).toHaveLength(0);
		});

		it('does not report a message sent during a run', async () => {
			const { telemetry, isStreaming } = setup();

			isStreaming.value = true;
			telemetry.trackSubmit(context);
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'stop' });
			await flushRender();

			expect(receivedCalls()).toHaveLength(0);
		});

		it('does not report a message that the server steered into a running run', async () => {
			const { telemetry } = setup();

			telemetry.trackSubmit(context);
			telemetry.handleStreamEvent({
				type: 'message-steered',
				queueId: 'q-1',
				executionId: 'exec-0',
				message: { id: 'm-1', role: 'user', content: [] },
			} as AgentSseEvent);
			telemetry.handleStreamEvent(started);
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'stop' });
			await flushRender();

			expect(receivedCalls()).toHaveLength(0);
		});

		it('does not report a run that no user message started, such as a card answer', async () => {
			const { telemetry } = setup();

			telemetry.handleStreamEvent(started);
			telemetry.handleStreamEvent({ type: 'finish', finishReason: 'stop' });
			await flushRender();

			expect(receivedCalls()).toHaveLength(0);
		});
	});

	describe('Builder generation stalled', () => {
		it('reports a run that sends nothing for a minute, once for each silent period', async () => {
			const { telemetry, isStreaming } = setup();

			isStreaming.value = true;
			await nextTick();
			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS);
			expect(stalledCalls()).toEqual([[STALLED, { thread_id: 'thread-1', runtime: 'agents' }]]);

			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS);
			expect(stalledCalls()).toHaveLength(1);

			telemetry.handleStreamEvent({ type: 'text-delta', id: 't1', delta: 'Hi' });
			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS);
			expect(stalledCalls()).toHaveLength(2);
		});

		it('restarts the countdown on each stream event', async () => {
			const { telemetry, isStreaming } = setup();

			isStreaming.value = true;
			await nextTick();
			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS - 1_000);
			telemetry.handleStreamEvent({ type: 'start-step' });
			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS - 1_000);

			expect(stalledCalls()).toHaveLength(0);
		});

		it('does not report a run that shows a card', async () => {
			const { isStreaming, hasOpenInteraction } = setup();

			isStreaming.value = true;
			hasOpenInteraction.value = true;
			await nextTick();
			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS * 2);

			expect(stalledCalls()).toHaveLength(0);
		});

		it('does not report after the run ends or the view unmounts', async () => {
			const first = setup();
			first.isStreaming.value = true;
			await nextTick();
			first.isStreaming.value = false;
			await nextTick();

			const second = setup();
			second.isStreaming.value = true;
			await nextTick();
			second.wrapper.unmount();

			await vi.advanceTimersByTimeAsync(GENERATION_STALL_TIMEOUT_MS * 2);
			expect(stalledCalls()).toHaveLength(0);
		});
	});
});
