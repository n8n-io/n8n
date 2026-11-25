import {
	EXTENDED_PROMPT_MAX_LENGTH,
	type InstanceAiAgentAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, inject, ref, type Ref } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import {
	clearPendingHandoffContext,
	getPendingHandoffContext,
	getPendingComposerDraft,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingHandoffContext,
} from '../../composables/useInstanceAiHandoff';
import {
	ASSISTANT_AGENT_SETUP_SAVED,
	type PendingSetupSave,
} from '../../assistantAgent/useAssistantAgentSetupSavedTelemetry';
import AssistantAgentPanelThread from '../AssistantAgentPanelThread.vue';

const {
	panelProps,
	sendMessageFromOutside,
	setDraft,
	clearDraftIfMatches,
	telemetryTrack,
	chatMessages,
	expectSetupResult,
} = vi.hoisted(() => ({
	panelProps: { current: {} as Record<string, unknown> },
	sendMessageFromOutside: vi.fn(),
	setDraft: vi.fn(),
	clearDraftIfMatches: vi.fn(),
	telemetryTrack: vi.fn(),
	chatMessages: { current: undefined as Ref<ChatMessage[]> | undefined },
	expectSetupResult: { current: undefined as ((save: PendingSetupSave) => void) | undefined },
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose, slots }) {
			// A setup card in the chat reads this to report an accepted apply.
			expectSetupResult.current = inject(ASSISTANT_AGENT_SETUP_SAVED, undefined);
			const messages = ref<ChatMessage[]>([]);
			chatMessages.current = messages;
			expose({
				sendMessageFromOutside,
				setDraft,
				clearDraftIfMatches,
				focusInput: vi.fn(),
				isDirty: () => false,
				messages,
				isStreaming: ref(false),
				isLoadingHistory: ref(false),
			});
			return () => {
				panelProps.current = { ...attrs };
				return h(
					'div',
					{ 'data-test-id': 'agent-chat-panel-stub' },
					slots['composer-attachments']?.(),
				);
			};
		},
	}),
}));

vi.mock('../../composables/useAgentMutationRefresh', () => ({ useAgentMutationRefresh: vi.fn() }));

type AcceptMessage = (payload: { clientContext?: Record<string, unknown> }) => void;

const subject: InstanceAiAgentAttachment = {
	type: 'agent',
	id: 'agent-1',
	projectId: 'p1',
	name: 'Support agent',
};

const preview: InstanceAiHandoffContext = {
	source: 'agent-preview',
	agentId: 'agent-1',
	threadId: 'preview-1',
};

function clientContext(): Record<string, unknown> {
	return (panelProps.current['client-context'] as () => Record<string, unknown>)();
}

function acceptMessage(context: Record<string, unknown>): void {
	(panelProps.current.onMessageAccepted as AcceptMessage)({ clientContext: context });
}

/** The chat reports a send, and the test reads the message telemetry it caused. */
function sendAndReadTelemetry(text: string): Record<string, unknown> | undefined {
	telemetryTrack.mockClear();
	(panelProps.current.onMessageSending as (payload: unknown) => void)({
		text,
		files: [],
		isFirstMessage: false,
	});
	return telemetryTrack.mock.calls[0]?.[1];
}

async function render() {
	const wrapper = mount(AssistantAgentPanelThread, {
		props: { threadId: 'thread-1', subject, newSession: true },
	});
	await flushPromises();
	return wrapper;
}

describe('AssistantAgentPanelThread', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		panelProps.current = {};
		sendMessageFromOutside.mockReset();
		setDraft.mockReset();
		clearDraftIfMatches.mockReset();
		telemetryTrack.mockReset();
		clearPendingHandoffContext('thread-1');
	});

	it('passes the preview ref to the composer without reading its frames', async () => {
		const placeholderPreview = ref<string | undefined>('Build');
		const Host = defineComponent({
			setup: () => () =>
				h(AssistantAgentPanelThread, {
					threadId: 'thread-1',
					subject,
					newSession: true,
					placeholderPreview,
				}),
		});
		const wrapper = mount(Host);
		await flushPromises();
		expect(panelProps.current['placeholder-preview']).toBe(placeholderPreview);
		placeholderPreview.value = 'Build me an agent';
		await flushPromises();
		expect(panelProps.current['placeholder-preview']).toBe(placeholderPreview);
		wrapper.unmount();
	});

	it('passes visibility and draft changes between the builder and the chat', async () => {
		const wrapper = await render();
		expect(panelProps.current.autofocus).toBe('');
		await wrapper.setProps({ visible: false });
		expect(panelProps.current.visible).toBe(false);
		const onContentChange = panelProps.current.onContentChange as (hasContent: boolean) => void;
		onContentChange(true);
		expect(wrapper.emitted('content-change')).toEqual([[true]]);
	});

	it('lets the composer take a message up to the Assistant limit', async () => {
		await render();
		expect(panelProps.current['max-length']).toBe(EXTENDED_PROMPT_MAX_LENGTH);
	});

	it('opens a new thread of the Assistant agent on the system channel', async () => {
		await render();

		expect(panelProps.current).toMatchObject({
			'agent-id': 'assistant',
			'project-id': 'p1',
			'continue-session-id': 'thread-1',
			'new-session': true,
			channel: 'system',
		});
	});

	it('sends the agent with each message, as a reference and as the subject', async () => {
		await render();

		const first = clientContext();
		expect(first.attachments).toEqual([subject]);
		expect(first.subject).toEqual(subject);
		acceptMessage(first);

		expect(clientContext()).toMatchObject({ attachments: [subject], subject });
	});

	it('sends the hand-off context with the next message only', async () => {
		stashPendingHandoffContext('thread-1', preview);
		await render();

		const first = clientContext();
		expect(first.context).toEqual(preview);
		acceptMessage(first);

		expect(clientContext()).not.toHaveProperty('context');
		expect(getPendingHandoffContext('thread-1')).toBeNull();
	});

	it('keeps a hand-off that arrives while a message is in flight', async () => {
		stashPendingHandoffContext('thread-1', preview);
		const wrapper = await render();
		const sent = clientContext();

		const newer: InstanceAiHandoffContext = { ...preview, threadId: 'preview-2' };
		wrapper.vm.applyHandoff(newer);
		acceptMessage(sent);

		expect(clientContext().context).toEqual(newer);
		expect(getPendingHandoffContext('thread-1')).toEqual(newer);
	});

	it('shows an agent preview hand-off as a chip, and drops it when the user removes the chip', async () => {
		stashPendingHandoffContext('thread-1', preview);
		const wrapper = await render();

		const chip = wrapper.find('[data-test-id="instance-ai-handoff-context-chip"]');
		expect(chip.text()).toContain('Support agent session');

		await chip.find('[data-test-id="instance-ai-handoff-context-chip-dismiss"]').trigger('click');

		expect(wrapper.find('[data-test-id="instance-ai-handoff-context-chip"]').exists()).toBe(false);
		expect(clientContext()).not.toHaveProperty('context');
		expect(getPendingHandoffContext('thread-1')).toBeNull();
	});

	it('removes the draft of the hand-off with the chip', async () => {
		stashPendingHandoffContext('thread-1', preview);
		stashPendingComposerDraft('thread-1', {
			text: 'Fix the reply tone',
			prefillType: 'handoff_agent_change_request',
		});
		const wrapper = await render();
		expect(setDraft).toHaveBeenCalledWith('Fix the reply tone');

		await wrapper
			.find('[data-test-id="instance-ai-handoff-context-chip-dismiss"]')
			.trigger('click');

		expect(clearDraftIfMatches).toHaveBeenCalledWith('Fix the reply tone');
		expect(getPendingComposerDraft('thread-1')).toBeNull();
		// The chat reports the composer that the removed draft left empty.
		(panelProps.current.onDraftCleared as () => void)();
		expect(sendAndReadTelemetry('Something else')).toMatchObject({ prefill_type: null });
	});

	it('reports a sent hand-off draft as a pre-fill', async () => {
		stashPendingComposerDraft('thread-1', {
			text: 'Fix the reply tone',
			prefillType: 'handoff_agent_change_request',
		});
		await render();

		expect(sendAndReadTelemetry('Fix the reply tone')).toMatchObject({
			prefill_type: 'handoff_agent_change_request',
			prompt_modified: false,
			runtime: 'agents',
		});
	});

	it('reports a suggestion that the host sends as a pre-fill', async () => {
		const wrapper = await render();

		(wrapper.vm as unknown as { submitSuggestion: (payload: unknown) => void }).submitSuggestion({
			prompt: 'Summarize my inbox',
			suggestionId: 'summarize-inbox',
			suggestionKind: 'prompt',
			position: 0,
			prefillType: 'suggestion_catalog',
		});

		expect(sendMessageFromOutside).toHaveBeenCalledWith('Summarize my inbox');
		expect(sendAndReadTelemetry('Summarize my inbox')).toMatchObject({
			prefill_type: 'suggestion_catalog',
			prefill_id: 'summarize-inbox',
			prompt_modified: false,
		});
	});

	it('reports the response to a sent message with the runtime', async () => {
		await render();

		sendAndReadTelemetry('Add a Slack tool');
		const onStreamEvent = panelProps.current.onStreamEvent as (event: unknown) => void;
		onStreamEvent({ type: 'message-queued', queueId: 'q-1', sessionId: 'thread-1' });
		onStreamEvent({ type: 'execution-started', executionId: 'exec-1', sessionId: 'thread-1' });
		onStreamEvent({ type: 'finish', finishReason: 'stop' });

		await vi.waitFor(() =>
			expect(telemetryTrack).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_RECEIVED_AI_ASSISTANT_RESPONSE,
				expect.objectContaining({
					thread_id: 'thread-1',
					run_id: 'exec-1',
					response_kind: 'completed',
					runtime: 'agents',
				}),
			),
		);
	});

	it('removes the chip when the message with the hand-off is accepted', async () => {
		stashPendingHandoffContext('thread-1', preview);
		const wrapper = await render();

		acceptMessage(clientContext());
		await flushPromises();

		expect(wrapper.find('[data-test-id="instance-ai-handoff-context-chip"]').exists()).toBe(false);
	});

	it('sends a credential hand-off without a chip', async () => {
		const credential: InstanceAiHandoffContext = {
			source: 'credential-modal',
			credential: { credentialType: 'slackApi', displayName: 'Slack account' },
		};
		stashPendingHandoffContext('thread-1', credential);
		const wrapper = await render();

		expect(clientContext().context).toEqual(credential);
		expect(wrapper.find('[data-test-id="instance-ai-handoff-context-chip"]').exists()).toBe(false);
	});

	it('sends the starter message with its references and authorship on the first message only', async () => {
		const reference: InstanceAiResourceAttachment = { type: 'workflow', id: 'wf-1' };
		stashPendingFirstMessage('thread-1', {
			message: 'Add a Slack tool',
			attachments: [reference],
			authorship: { kind: 'prefill', prefillType: 'template_example', prefillId: 'slack' },
		});
		await render();

		expect(sendMessageFromOutside).toHaveBeenCalledWith('Add a Slack tool');
		expect(sendAndReadTelemetry('Add a Slack tool')).toMatchObject({
			prefill_type: 'template_example',
			prefill_id: 'slack',
		});
		const first = clientContext();
		expect(first.attachments).toEqual([reference, subject]);
		acceptMessage(first);

		expect(clientContext().attachments).toEqual([subject]);
	});

	it('sends the setup saved event when the chat shows the result of an accepted setup apply', async () => {
		await render();
		const node = { id: 'node-1', name: 'Slack', type: 'n8n-nodes-base.slack' };
		expectSetupResult.current?.({
			requestId: 'req-1',
			workflowId: 'wf-1',
			sections: [
				{ credentialType: 'slackApi', credentialTargetNodes: [node], parameterNames: [], node },
			],
		});

		chatMessages.current!.value = [
			{
				id: 'msg-1',
				role: 'assistant',
				content: '',
				toolCalls: [
					{
						tool: 'setup_workflow',
						toolCallId: 'call-1',
						state: 'done',
						suspendPayload: { requestId: 'req-1' },
						output: {
							success: true,
							completedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
						},
					},
				],
			} as unknown as ChatMessage,
		];
		await flushPromises();

		expect(telemetryTrack).toHaveBeenCalledWith(
			TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED,
			expect.objectContaining({
				thread_id: 'thread-1',
				workflow_id: 'wf-1',
				request_id: 'req-1',
				setup_complete: true,
				runtime: 'agents',
			}),
		);
	});
});
