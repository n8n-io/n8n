import type {
	InstanceAiAgentAttachment,
	InstanceAiHandoffContext,
	InstanceAiResourceAttachment,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';

import {
	clearPendingHandoffContext,
	getPendingHandoffContext,
	getPendingComposerDraft,
	stashPendingComposerDraft,
	stashPendingFirstMessage,
	stashPendingHandoffContext,
} from '../../composables/useInstanceAiHandoff';
import { USER_TYPED_MESSAGE } from '../../prefills';
import AssistantAgentPanelThread from '../AssistantAgentPanelThread.vue';

const {
	panelProps,
	sendMessageFromOutside,
	setDraft,
	clearDraftIfMatches,
	stagedChips,
	removeChip,
} = vi.hoisted(() => ({
	panelProps: { current: {} as Record<string, unknown> },
	sendMessageFromOutside: vi.fn(),
	setDraft: vi.fn(),
	clearDraftIfMatches: vi.fn(),
	stagedChips: { current: [] as Array<{ id: string; label: string }> },
	removeChip: vi.fn(),
}));

vi.mock('@/features/agents/components/AgentChatPanel.vue', () => ({
	default: defineComponent({
		inheritAttrs: false,
		setup(_props, { attrs, expose, slots }) {
			expose({
				sendMessageFromOutside,
				setDraft,
				clearDraftIfMatches,
				focusInput: vi.fn(),
				isDirty: () => false,
				messages: ref([]),
				isStreaming: ref(false),
				isLoadingHistory: ref(false),
			});
			return () => {
				panelProps.current = { ...attrs };
				return h(
					'div',
					{ 'data-test-id': 'agent-chat-panel-stub' },
					slots['composer-attachments']?.({ chips: stagedChips.current, removeChip }),
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
		removeChip.mockReset();
		stagedChips.current = [];
		clearPendingHandoffContext('thread-1');
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

	it('sends the agent with each message', async () => {
		await render();

		const first = clientContext();
		expect(first.attachments).toEqual([subject]);
		acceptMessage(first);

		expect(clientContext().attachments).toEqual([subject]);
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
		stagedChips.current = [{ id: 'nodes-1', label: 'Slack' }];
		const wrapper = await render();

		const chip = wrapper.find('[data-test-id="instance-ai-handoff-context-chip"]');
		expect(chip.text()).toContain('Support agent session');
		// The other chips of the composer stay.
		const staged = wrapper.find('[data-test-id="agent-chat-composer-chip"]');
		expect(staged.text()).toContain('Slack');
		await staged.find('[data-test-id="agent-chat-composer-chip-remove"]').trigger('click');
		expect(removeChip).toHaveBeenCalledWith('nodes-1');

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

	it('sends the starter message with its references on the first message only', async () => {
		const reference: InstanceAiResourceAttachment = { type: 'workflow', id: 'wf-1' };
		stashPendingFirstMessage('thread-1', {
			message: 'Add a Slack tool',
			attachments: [reference],
			authorship: USER_TYPED_MESSAGE,
		});
		await render();

		expect(sendMessageFromOutside).toHaveBeenCalledWith('Add a Slack tool');
		const first = clientContext();
		expect(first.attachments).toEqual([reference, subject]);
		acceptMessage(first);

		expect(clientContext().attachments).toEqual([subject]);
	});
});
