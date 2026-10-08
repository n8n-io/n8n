import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h, inject, type PropType } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { AGENT_CHAT_TOOL_STEP_NOTE } from '@/features/agents/utils/tool-step-note';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useInstanceAiStore } from '../../instanceAi.store';
import { useOptionalThreadSharing } from '../threadSharingContext';
import { provideThreadSharing } from '../useThreadSharing';
import {
	OWNER,
	PROJECT_ID,
	READ_SCOPES,
	TEAMMATE,
	THREAD_ID,
	setUpSharing,
	sharedThreadSummary,
} from './sharingFixtures';

const approved = (by: { id: string; name: string }): ToolCall => ({
	tool: 'executions',
	toolCallId: 'tc-1',
	state: 'done',
	approvedBy: by,
});
const declined = (by: { id: string; name: string }): ToolCall => ({
	tool: 'workflows',
	toolCallId: 'tc-2',
	state: 'done',
	declinedBy: by,
});

/** Renders what a card and a tool-step row deep in the conversation read. */
const Probe = defineComponent({
	props: { toolCalls: { type: Array as PropType<ToolCall[]>, required: true } },
	setup(props) {
		const note = inject(AGENT_CHAT_TOOL_STEP_NOTE, undefined);
		const sharing = useOptionalThreadSharing();
		return () =>
			h('div', [
				h('span', { 'data-test-id': 'role' }, sharing?.view.value.role),
				h(
					'span',
					{ 'data-test-id': 'access' },
					String(
						sharing?.cardAccess({
							toolName: 'executions',
							input: { action: 'run', workflowId: 'wf-1' },
							suspendPayload: { requestId: 'r', message: 'Run?', severity: 'info' },
						}),
					),
				),
				...props.toolCalls.map((toolCall) =>
					h('span', { 'data-test-id': `note-${toolCall.toolCallId}` }, note?.(toolCall) ?? ''),
				),
			]);
	},
});

function renderConversation(toolCalls: ToolCall[]) {
	const Host = defineComponent({
		setup() {
			provideThreadSharing({ id: THREAD_ID, projectId: PROJECT_ID }, () => []);
			return () => h(Probe, { toolCalls });
		},
	});
	return createComponentRenderer(Host)();
}

describe('provideThreadSharing', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('gives the owner every card and no names on the owner’s own answers in a private chat', () => {
		setUpSharing();
		const { getByTestId } = renderConversation([approved(OWNER)]);

		expect(getByTestId('role')).toHaveTextContent('owner');
		expect(getByTestId('access')).toHaveTextContent('undefined');
		expect(getByTestId('note-tc-1')).toHaveTextContent(/^$/);
	});

	it('names every answer in a shared chat, and the viewer as "you"', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id });
		const { getByTestId } = renderConversation([approved(OWNER), declined(TEAMMATE)]);

		expect(getByTestId('role')).toHaveTextContent('teammate');
		expect(getByTestId('note-tc-1')).toHaveTextContent('Approved by Alice Owner');
		expect(getByTestId('note-tc-2')).toHaveTextContent('Declined by you');
	});

	it('checks a teammate’s role in the chat project for each card', () => {
		setUpSharing({ shared: true, viewerId: TEAMMATE.id, scopes: READ_SCOPES });
		const { getByTestId } = renderConversation([]);

		expect(getByTestId('access')).toHaveTextContent('needs-role');
	});

	it('reads a chat that only the history page holds', () => {
		setUpSharing({ viewerId: TEAMMATE.id });
		const store = useInstanceAiStore();
		store.threads = [];
		store.threadHistory.threads = [sharedThreadSummary({ shared: true })];
		const { getByTestId } = renderConversation([approved(OWNER)]);

		expect(getByTestId('role')).toHaveTextContent('teammate');
		expect(getByTestId('note-tc-1')).toHaveTextContent('Approved by Alice Owner');
	});
});
